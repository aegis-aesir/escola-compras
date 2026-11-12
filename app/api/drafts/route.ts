import {env} from 'cloudflare:workers';
import {currentLocalUser} from '../../local-session';
import {canCreateRequest} from '../../access';
import {requestDraftSchema} from '../../request-draft';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await currentLocalUser();if(!user)return Response.json({error:'Entre com seu usuário.'},{status:401});
 if(!canCreateRequest(user.role))return Response.json({error:'Perfil sem permissão para rascunhos.'},{status:403});
 const rows=await env.DB!.prepare("SELECT id,data,version FROM records WHERE kind='request_draft' AND json_extract(data,'$.authorId')=? ORDER BY json_extract(data,'$.updatedAt') DESC").bind(user.id).all<{id:string;data:string;version:number}>();
 const submitted=await env.DB!.prepare("SELECT id FROM records WHERE kind='request' AND json_extract(data,'$.authorId')=?").bind(user.id).all<{id:string}>();
 return Response.json({submittedIds:submitted.results.map(r=>r.id),drafts:rows.results.map(r=>({id:r.id,version:r.version,values:JSON.parse(r.data).values,updatedAt:JSON.parse(r.data).updatedAt}))},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 const user=await currentLocalUser();if(!user)return Response.json({error:'Entre com seu usuário.'},{status:401});
 if(!canCreateRequest(user.role))return Response.json({error:'Perfil sem permissão para rascunhos.'},{status:403});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 try{
  if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Formato inválido.'},{status:400});
  const raw=await req.text();if(raw.length>90000)return Response.json({error:'Rascunho muito grande.'},{status:400});
  const b=z.object({id:z.string().uuid(),version:z.number().int().nonnegative(),values:requestDraftSchema}).parse(JSON.parse(raw));
  const updatedAt=new Date().toISOString(),data=JSON.stringify({authorId:user.id,status:'draft',values:b.values,updatedAt});
  const result=b.version===0?await env.DB!.prepare("INSERT OR IGNORE INTO records(id,kind,data,version) VALUES(?,'request_draft',?,1)").bind(b.id,data).run():await env.DB!.prepare("UPDATE records SET data=?,version=version+1 WHERE id=? AND kind='request_draft' AND version=? AND json_extract(data,'$.authorId')=?").bind(data,b.id,b.version,user.id).run();
  if(result.meta.changes!==1)return Response.json({error:'Rascunho atualizado em outra aba ou já enviado. Feche e reabra para conferir; sua cópia local foi preservada.'},{status:409});
  return Response.json({id:b.id,version:b.version+1,updatedAt});
 }catch{return Response.json({error:'Não foi possível salvar o rascunho. Confira os dados.'},{status:400});}
}
