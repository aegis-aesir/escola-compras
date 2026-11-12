import {env} from 'cloudflare:workers';
import {currentLocalUser} from '../../local-session';
import {canCreateRequest} from '../../access';
import {requestDraftSchema} from '../../request-draft';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const user=await currentLocalUser();if(!user)return Response.json({error:'Entre com seu usuário.'},{status:401});
 if(!canCreateRequest(user.role))return Response.json({error:'Perfil sem permissão para rascunhos.'},{status:403});
 const all=user.role==='admin'&&new URL(req.url).searchParams.get('scope')==='all';
 const rows=await env.DB!.prepare(`SELECT draft.id,draft.data,draft.version,author.data AS authorData FROM records draft LEFT JOIN records author ON author.id=json_extract(draft.data,'$.authorId') AND author.kind='local_user' WHERE draft.kind='request_draft'${all?'':" AND json_extract(draft.data,'$.authorId')=?"} ORDER BY json_extract(draft.data,'$.updatedAt') DESC`).bind(...(all?[]:[user.id])).all<{id:string;data:string;version:number;authorData?:string}>();
 const submitted=await env.DB!.prepare(`SELECT id FROM records WHERE kind='request'${all?'':" AND json_extract(data,'$.authorId')=?"}`).bind(...(all?[]:[user.id])).all<{id:string}>();
 return Response.json({submittedIds:submitted.results.map(r=>r.id),drafts:rows.results.map(r=>{const data=JSON.parse(r.data),author=r.authorData?JSON.parse(r.authorData):{};return {id:r.id,version:r.version,values:data.values,updatedAt:data.updatedAt,status:data.status||'draft',sourceRequestId:data.sourceRequestId,sourceCode:data.sourceCode,deferReason:data.deferReason,availableMonth:data.availableMonth,deferredAt:data.deferredAt,archivedAt:data.archivedAt,archivedBy:data.archivedBy,authorName:author.name||data.authorName||'Usuário não identificado',authorDepartment:author.department||data.authorDepartment||'Setor não identificado'}})},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 const user=await currentLocalUser();if(!user)return Response.json({error:'Entre com seu usuário.'},{status:401});
 if(!canCreateRequest(user.role))return Response.json({error:'Perfil sem permissão para rascunhos.'},{status:403});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 try{
  if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Formato inválido.'},{status:400});
  const raw=await req.text();if(raw.length>90000)return Response.json({error:'Rascunho muito grande.'},{status:400});const input=JSON.parse(raw);
  if(input.action==='archive'||input.action==='restore'){
   const b=z.object({action:z.enum(['archive','restore']),id:z.string().uuid(),version:z.number().int().positive()}).parse(input);
   const row=await env.DB!.prepare("SELECT data,version FROM records WHERE id=? AND kind='request_draft'").bind(b.id).first<{data:string;version:number}>();
   if(!row)return Response.json({error:'Rascunho não encontrado.'},{status:404});const current=JSON.parse(row.data);
   if(user.role!=='admin'&&current.authorId!==user.id)return Response.json({error:'Rascunho não encontrado.'},{status:404});
   if(row.version!==b.version||b.action==='archive'&&current.archivedAt||b.action==='restore'&&!current.archivedAt)return Response.json({error:'Rascunho atualizado em outra aba. Recarregue para conferir.'},{status:409});
   const updatedAt=new Date().toISOString(),next={...current,updatedAt};
   if(b.action==='archive'){next.archivedAt=updatedAt;next.archivedBy=user.name}else{delete next.archivedAt;delete next.archivedBy}
   const result=await env.DB!.prepare("UPDATE records SET data=?,version=version+1 WHERE id=? AND kind='request_draft' AND version=?").bind(JSON.stringify(next),b.id,b.version).run();
   if(result.meta.changes!==1)return Response.json({error:'Rascunho atualizado em outra aba. Recarregue para conferir.'},{status:409});
   return Response.json({id:b.id,version:b.version+1,updatedAt,archivedAt:next.archivedAt,archivedBy:next.archivedBy});
  }
  const b=z.object({id:z.string().uuid(),version:z.number().int().nonnegative(),values:requestDraftSchema}).parse(input);
  const updatedAt=new Date().toISOString(),data=JSON.stringify({authorId:user.id,authorName:user.name,authorDepartment:user.department,status:'draft',values:b.values,updatedAt});
  const result=b.version===0?await env.DB!.prepare("INSERT OR IGNORE INTO records(id,kind,data,version) VALUES(?,'request_draft',?,1)").bind(b.id,data).run():await env.DB!.prepare("UPDATE records SET data=json_set(data,'$.values',json(?),'$.updatedAt',?),version=version+1 WHERE id=? AND kind='request_draft' AND version=? AND json_extract(data,'$.authorId')=? AND json_extract(data,'$.archivedAt') IS NULL").bind(JSON.stringify(b.values),updatedAt,b.id,b.version,user.id).run();
  if(result.meta.changes!==1)return Response.json({error:'Rascunho atualizado em outra aba ou já enviado. Feche e reabra para conferir; sua cópia local foi preservada.'},{status:409});
  return Response.json({id:b.id,version:b.version+1,updatedAt});
 }catch{return Response.json({error:'Não foi possível salvar o rascunho. Confira os dados.'},{status:400});}
}
