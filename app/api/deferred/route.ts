import {env} from 'cloudflare:workers';
import {currentLocalUser} from '../../local-session';
import {canEditDeferred,deferredValues} from '../../deferred-request';
import {requestDraftSchema} from '../../request-draft';
import type {Purchase} from '../../model';
import {consolidateDeferredDrafts,deferredMonthClosed} from '../../../lib/deferred-requests';
import {z} from 'zod';
export const dynamic='force-dynamic';
async function current(id:string){const row=await env.DB!.prepare("SELECT data,version FROM records WHERE id=? AND kind='request'").bind(id).first<{data:string;version:number}>();return row?{...JSON.parse(row.data),id,version:row.version} as Purchase:null}
export async function GET(req:Request){
 const me=await currentLocalUser();if(!me)return Response.json({error:'Entre com seu usuário.'},{status:401});
 await consolidateDeferredDrafts(env.DB!,new Date().toISOString());
 const request=await current(new URL(req.url).searchParams.get('id')||'');
 if(!request||!canEditDeferred(request,me))return Response.json({error:'Solicitação adiada indisponível para edição.'},{status:403});
 return Response.json({id:request.id,version:request.version,values:deferredValues(request),updatedAt:request.deferredEdit?.updatedAt||request.updatedAt,availableMonth:request.deferred?.availableMonth,closed:await deferredMonthClosed(env.DB!,request)},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 const me=await currentLocalUser();if(!me)return Response.json({error:'Entre com seu usuário.'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 try{
  if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('Formato inválido.');
  const raw=await req.text();if(raw.length>90000)throw new Error('Revisão muito grande.');
  const b=z.object({id:z.string().uuid(),version:z.number().int().positive(),values:requestDraftSchema}).strict().parse(JSON.parse(raw));
  const request=await current(b.id);if(!request||!canEditDeferred(request,me))return Response.json({error:'Solicitação adiada indisponível para edição.'},{status:403});
  if(request.version!==b.version)return Response.json({error:'Solicitação atualizada. Feche e reabra para conferir; sua revisão local foi preservada.'},{status:409});
  if(b.values.department!==request.department)return Response.json({error:'Mantenha o setor original da solicitação.'},{status:400});
  if(await deferredMonthClosed(env.DB!,request))return Response.json({error:'Reabra o fechamento mensal antes de revisar este pedido.'},{status:409});
  const updatedAt=new Date().toISOString(),edit={values:b.values,actor:me.name,updatedAt};
  const result=await env.DB!.prepare("UPDATE records SET data=json_set(data,'$.deferredEdit',json(?)),version=version+1 WHERE id=? AND kind='request' AND version=? AND json_extract(data,'$.status')='deferred' AND json_extract(data,'$.archived') IS NULL AND NOT EXISTS(SELECT 1 FROM records c WHERE c.kind='budget_closing' AND json_extract(c.data,'$.month')=COALESCE(json_extract(records.data,'$.management.referenceMonth'),json_extract(records.data,'$.form.fields.referenceMonth')) AND json_extract(c.data,'$.status')='Concluído')").bind(JSON.stringify(edit),b.id,b.version).run();
  if(result.meta.changes!==1)return Response.json({error:'Solicitação atualizada ou mês fechado. Reabra para conferir.'},{status:409});
  return Response.json({id:b.id,version:b.version+1,updatedAt});
 }catch(e){return Response.json({error:e instanceof z.ZodError?'Confira os campos da revisão.':e instanceof Error?e.message:'Não foi possível salvar.'},{status:400})}
}
