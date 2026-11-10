import {readSession, type LocalUser} from './local-auth';

type FileEnv={DB?:D1Database;BUCKET?:R2Bucket};
type FileRecord={id:string;requestId:string;key:string;name:string;size:number;visibility:'request'|'internal';author:string;at:string};
const maxFile=5*1024*1024, maxBody=maxFile+65536;
class FileError extends Error{constructor(message:string,public status=400){super(message)}}
const management=(u:LocalUser)=>u.role==='admin'||u.role==='administrativo';
async function accessible(db:D1Database,id:string,user:LocalUser){
  const row=await db.prepare("SELECT data,version FROM records WHERE id=? AND kind='request'").bind(id).first<{data:string;version:number}>();
  if(!row)throw new FileError('Solicitação não encontrada.',404);
  const r={...JSON.parse(row.data),version:row.version};
  if(!management(user)&&!(user.role==='solicitante'&&r.authorId===user.id)&&!(user.role==='geral'&&r.status==='general_review'))throw new FileError('Solicitação não encontrada.',404);
  return r;
}
function validFile(name:string,b:Uint8Array){
  const ext=name.split('.').pop()?.toLowerCase(),head=new TextDecoder().decode(b.slice(0,512));
  if(ext==='pdf')return head.startsWith('%PDF-');
  if(ext==='png')return b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
  if(ext==='jpg'||ext==='jpeg')return b[0]===255&&b[1]===216&&b[2]===255;
  if(['docx','xlsx','pptx'].includes(ext||''))return b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4;
  if(ext==='xml')return head.trimStart().startsWith('<')&&!head.includes('\0');
  if(ext==='txt'||ext==='csv')return !b.includes(0);
  return false;
}
async function boundedMultipart(req:Request){
  if(!req.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new FileError('Envie o arquivo como formulário.');
  if(Number(req.headers.get('content-length')||0)>maxBody)throw new FileError('O limite por arquivo é 5 MB.',413);
  const reader=req.body?.getReader();if(!reader)throw new FileError('Arquivo ausente.');
  let n=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>maxBody){await reader.cancel();throw new FileError('O limite por arquivo é 5 MB.',413)}chunks.push(value)}
  const bytes=new Uint8Array(n);let p=0;for(const c of chunks){bytes.set(c,p);p+=c.length}
  return new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')!}}).formData();
}
export async function filesEndpoint(req:Request,env:FileEnv){
  const json=(v:object,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  try{
    if(!env.DB)throw new FileError('Banco indisponível.',503);
    const db=env.DB,url=new URL(req.url),local=url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
    const user=await readSession(db,req.headers.get('cookie')||'',local);
    if(!user)throw new FileError('Entre com seu usuário e senha.',401);
    if(user.mustChangePassword)throw new FileError('Altere sua senha temporária.',403);
    if(req.method==='GET'){
      const id=url.pathname.slice('/api/files/'.length);
      if(url.pathname==='/api/files'||url.pathname==='/api/files/'){
        const requestId=url.searchParams.get('requestId')||'';await accessible(db,requestId,user);
        const rows=await db.prepare("SELECT id,data FROM records WHERE kind='budget_file' AND json_extract(data,'$.requestId')=? ORDER BY id").bind(requestId).all<{id:string;data:string}>();
        return json({files:rows.results.map(r=>({...JSON.parse(r.data),id:r.id}) as FileRecord).filter(f=>management(user)||f.visibility==='request').map(({key,...f})=>f)});
      }
      const row=await db.prepare("SELECT id,data FROM records WHERE id=? AND kind='budget_file'").bind(id).first<{id:string;data:string}>();
      if(!row)throw new FileError('Arquivo não encontrado.',404);
      const f={...JSON.parse(row.data),id:row.id} as FileRecord;await accessible(db,f.requestId,user);
      if(!management(user)&&f.visibility!=='request')throw new FileError('Arquivo não encontrado.',404);
      if(!env.BUCKET)throw new FileError('Armazenamento indisponível.',503);
      const object=await env.BUCKET.get(f.key);if(!object)throw new FileError('Arquivo não encontrado.',404);
      return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Length':String(f.size),'Content-Disposition':`attachment; filename="documento"; filename*=UTF-8''${encodeURIComponent(f.name).replace(/'/g,'%27')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
    }
    if(req.method!=='POST')throw new FileError('Método não permitido.',405);
    if(req.headers.get('origin')!==url.origin||req.headers.get('sec-fetch-site')==='cross-site')throw new FileError('Origem inválida.',403);
    if(user.role==='geral')throw new FileError('Seu perfil não permite anexar documentos.',403);
    if(!env.BUCKET)throw new FileError('Armazenamento de anexos indisponível.',503);
    const form=await boundedMultipart(req),requestId=String(form.get('requestId')||''),visibility=String(form.get('visibility')||'request');
    if(!['request','internal'].includes(visibility))throw new FileError('Visibilidade inválida.');
    const r=await accessible(db,requestId,user);
    if(!management(user)&&(visibility!=='request'||!['estimating','pending','correction'].includes(r.status)))throw new FileError('Seu perfil não pode alterar documentos nesta etapa.',403);
    const month=String(r.management?.referenceMonth||r.form?.fields.referenceMonth||'');
    if(await db.prepare("SELECT id FROM records WHERE kind='budget_closing' AND json_extract(data,'$.month')=? AND json_extract(data,'$.status')='Concluído'").bind(month).first())throw new FileError('Reabra o fechamento mensal antes de anexar documentos.');
    const file=form.get('file');if(!file||typeof file==='string')throw new FileError('Selecione um arquivo.');
    if(!file.size||file.size>maxFile)throw new FileError('O arquivo deve ter até 5 MB.',413);
    const bytes=new Uint8Array(await file.arrayBuffer()),name=file.name.replace(/[\u0000-\u001f\u007f/\\]/g,'_').slice(0,180);
    if(!validFile(name,bytes))throw new FileError('Tipo ou conteúdo inválido. Use PDF, PNG, JPG, DOCX, XLSX, PPTX, XML, TXT ou CSV.');
    const id=crypto.randomUUID(),at=new Date().toISOString(),key='requests/'+requestId+'/'+id;
    const data={requestId,key,name,size:file.size,visibility,author:user.name,at};
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
    try{
      const result=await db.batch([
        db.prepare("INSERT INTO records(id,kind,data,version) SELECT ?,'budget_file',?,1 WHERE (SELECT COUNT(*) FROM records WHERE kind='budget_file' AND json_extract(data,'$.requestId')=?)<20 AND EXISTS(SELECT 1 FROM records WHERE id=? AND version=?) AND EXISTS(SELECT 1 FROM records WHERE id=? AND kind='request' AND version=?) AND NOT EXISTS(SELECT 1 FROM records WHERE kind='budget_closing' AND json_extract(data,'$.month')=? AND json_extract(data,'$.status')='Concluído')").bind(id,JSON.stringify(data),requestId,user.id,user.version,requestId,r.version,month),
        db.prepare('INSERT INTO audit(id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),requestId,user.name,'Documento anexado: '+name+' · '+visibility,at),
      ]);
      if(result[0].meta.changes!==1)throw new FileError('Limite de 20 anexos atingido ou sessão atualizada.');
    }catch(error){await env.BUCKET.delete(key);throw error}
    return json({ok:true,id});
  }catch(error){return json({error:error instanceof FileError?error.message:'Não foi possível acessar o documento.'},error instanceof FileError?error.status:500)}
}
