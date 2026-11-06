import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { requestSchema, supplierSchema, quoteSchema, quoteTotal, sectors, type Purchase, type Supplier, type Settings } from '../../model';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const initial:Settings = {name:'Colégio Estrelas',legalName:'Centro Educacional Estrelas do Amanhã LTDA',minQuotes:3,departments:sectors};
class AppError extends Error {constructor(message:string,public status=400){super(message)}}
async function context(){
  const user=await getChatGPTUser(); if(!user)throw new AppError('Entre para continuar.',401);
  const db=env.DB!;
  await db.prepare('INSERT OR IGNORE INTO school (id, owner, data) VALUES (1, ?, ?)').bind(user.userId,JSON.stringify(initial)).run();
  const school=await db.prepare('SELECT * FROM school WHERE id=1').first<{owner:string;data:string}>();
  const rows=await db.prepare('SELECT * FROM records').all<{id:string;kind:string;data:string;version:number}>();
  const all=rows.results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,version:r.version}));
  const member=all.find(r=>r.kind==='member'&&r.email===user.email.toLowerCase());
  if(school!.owner!==user.userId&&!member)throw new AppError('Seu acesso ainda não foi cadastrado pela administração.',403);
  const me={id:user.userId,name:user.displayName,email:user.email,role:school!.owner===user.userId?'admin':member.role,department:member?.department||'Administrativo'};
  return {db,all,me,settings:JSON.parse(school!.data) as Settings};
}
function fail(e:unknown){if(e instanceof z.ZodError)return Response.json({error:e.issues[0]?.message||'Confira os campos.'},{status:400}); if(e instanceof AppError)return Response.json({error:e.message},{status:e.status}); console.error('Data operation failed',e instanceof Error?e.message:'unknown');return Response.json({error:'Não foi possível salvar. Tente novamente.'},{status:500});}
export async function GET(){try{const {db,all,me,settings}=await context();const requests=all.filter(r=>r.kind==='request'&&(me.role!=='solicitante'||r.authorId===me.id));const ids=new Set(requests.map(r=>r.id));const activity=await db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 200').all();return Response.json({requests,suppliers:me.role==='solicitante'?[]:all.filter(r=>r.kind==='supplier'),members:me.role==='admin'?all.filter(r=>r.kind==='member'):[],settings,me,activity:activity.results.filter((r:any)=>me.role!=='solicitante'||ids.has(r.entity))},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e)}}
export async function POST(req:Request){try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new AppError('Origem inválida.',403);
  if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError('Formato inválido.');
  const raw=await req.text();if(raw.length>100000)throw new AppError('Solicitação muito grande.');
  let b:any;try{b=JSON.parse(raw)}catch{throw new AppError('Conteúdo inválido.')}
  const {db,all,me,settings}=await context();const now=new Date().toISOString();
  const permit=(roles:string[])=>{if(!roles.includes(me.role))throw new AppError('Seu perfil não permite esta ação.',403)};
  let id:string=crypto.randomUUID(),kind='',data:any,action='',old:any;
  if(b.action==='request'){
    const input=requestSchema.parse(b.data);if(!settings.departments.includes(input.department))throw new AppError('Selecione um setor cadastrado.');
    if(me.role==='solicitante'&&input.department!==me.department)throw new AppError('Você só pode solicitar para seu setor.',403);
    kind='request';data={...input,code:'CE-'+id.slice(0,8).toUpperCase(),authorId:me.id,authorName:me.name,status:'pending',quotes:[],createdAt:now,updatedAt:now};action='Solicitação criada';
  }else if(b.action==='supplier'){
    permit(['admin','compras']);kind='supplier';data=supplierSchema.parse(b.data);action='Fornecedor cadastrado';
  }else if(b.action==='member'){
    permit(['admin']);kind='member';data=z.object({email:z.string().email().transform(v=>v.toLowerCase()),name:z.string().trim().min(2).max(100),role:z.enum(['solicitante','compras','aprovador','admin']),department:z.string()}).parse(b.data);
    if(!settings.departments.includes(data.department))throw new AppError('Setor inválido.');
    old=all.find(r=>r.kind==='member'&&r.email===data.email);if(old)id=old.id;action='Acesso atualizado';
  }else if(b.action==='settings'){
    permit(['admin']);const input=z.object({minQuotes:z.number().int().min(1).max(10),departments:z.array(z.string().trim().min(2).max(80)).min(1).max(50)}).parse(b.data);
    if(all.some(r=>r.kind==='member'&&!input.departments.includes(r.department)))throw new AppError('Há usuários vinculados a um setor que seria removido. Atualize seus acessos primeiro.');
    await db.batch([db.prepare('UPDATE school SET data=? WHERE id=1').bind(JSON.stringify({...settings,...input,departments:[...new Set(input.departments)]})),db.prepare('INSERT INTO audit (id,entity,actor,action,at) VALUES (?,?,?,?,?)').bind(id,'school',me.name,'Regras e setores atualizados',now)]);return Response.json({ok:true});
  }else{
    old=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;if(!old)throw new AppError('Solicitação não encontrada.',404);
    if(old.version!==b.version)throw new AppError('Esta solicitação foi atualizada. Recarregue antes de continuar.',409);
    id=old.id;kind='request';data={...old,updatedAt:now};
    const reason=()=>z.string().trim().min(5,'Explique o motivo com pelo menos 5 caracteres.').max(2000).parse(b.reason);
    if(b.action==='approve'){
      permit(['admin','aprovador']);if(old.status!=='pending')throw new AppError('Solicitação fora da etapa de aprovação.');data.status='quoting';action='Solicitação aprovada para cotação';
    }else if(b.action==='reject'){
      permit(['admin','aprovador']);if(!['pending','quoting'].includes(old.status))throw new AppError('Esta etapa não permite recusa.');data.status='rejected';data.decision=reason();action='Solicitação não aprovada: '+data.decision;
    }else if(b.action==='quote'){
      permit(['admin','compras']);if(old.status!=='quoting')throw new AppError('Abra a etapa de cotação primeiro.');const q=quoteSchema.parse(b.data);const supplier=all.find(r=>r.id===q.supplierId&&r.kind==='supplier') as Supplier|undefined;
      if(!supplier)throw new AppError('Fornecedor não encontrado.');if(q.prices.length!==old.items.length)throw new AppError('Informe um preço para cada item.');
      data.quotes=[...old.quotes.filter((v:any)=>v.supplierId!==q.supplierId),{...q,id:crypto.randomUUID(),supplierName:supplier.name,total:quoteTotal(old.items,q.prices,q.freight),createdAt:now}];action='Cotação registrada/atualizada: '+supplier.name;
    }else if(b.action==='select'){
      permit(['admin','aprovador']);if(old.status!=='quoting')throw new AppError('Solicitação fora da etapa de cotação.');const q=old.quotes.find((v:any)=>v.id===b.quoteId);if(!q)throw new AppError('Selecione uma cotação.');
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());if(q.validUntil<today)throw new AppError('Esta proposta está vencida. Atualize a cotação antes de aprovar.');
      if(old.quotes.filter((v:any)=>v.validUntil>=today).length<settings.minQuotes)throw new AppError(`São necessárias ${settings.minQuotes} cotações válidas. Ajuste a regra nas configurações se necessário.`);
      data.selectedQuoteId=q.id;data.decision=reason();data.status='approved';action='Compra aprovada: '+q.supplierName+' — '+data.decision;
    }else if(b.action==='ordered'){
      permit(['admin','compras']);if(old.status!=='approved')throw new AppError('A compra precisa estar aprovada.');data.status='ordered';action='Pedido registrado: '+reason();
    }else if(b.action==='received'){
      permit(['admin','compras']);if(old.status!=='ordered')throw new AppError('O pedido precisa estar realizado.');data.status='received';action='Recebimento conferido: '+reason();
    }else throw new AppError('Ação desconhecida.');
  }
  const write=old?db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(data),id,old.version):db.prepare('INSERT INTO records (id,kind,data,version) VALUES (?,?,?,1)').bind(id,kind,JSON.stringify(data));
  const log=db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,me.name,action,now);
  const result=await db.batch([write,log]);if(result[0].meta.changes!==1)throw new AppError('Outra pessoa atualizou este registro. Recarregue a página.',409);
  return Response.json({ok:true,id});
}catch(e){return fail(e)}}
