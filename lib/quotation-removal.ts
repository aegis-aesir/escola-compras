import {z} from 'zod';
import {FlowError} from '../app/workflow';
import type {Purchase} from '../app/model';
import {canRemoveQuotationJob,type IntegrationJob} from '../app/integration-model';
import {row} from './integrations';
const schema=z.object({id:z.string().regex(/^whatsapp:[a-f0-9]{64}$/),version:z.number().int().positive(),reason:z.string().trim().min(5,'Informe um motivo com pelo menos 5 caracteres.').max(1000)});
async function change(db:D1Database,input:unknown,actor:{role:string;name:string},now:string,restore:boolean){
 if(!['admin','administrativo'].includes(actor.role))throw new FlowError('Seu perfil não permite excluir cotações.',403);
 const b=schema.parse(input),j=await row<IntegrationJob>(db,b.id,'integration_job');
 if(!j||j.version!==b.version||j.type!=='whatsapp_quote')throw new FlowError('Cotação atualizada. Recarregue.',409);
 if(restore?(!j.removed||!['done','cancelled'].includes(j.state)):!canRemoveQuotationJob(j))throw new FlowError('Cotação indisponível ou envio em processamento/incerto. Confira antes de excluir ou restaurar.',409);
 const r=await row<Purchase>(db,j.requestId,'request');if(!r||r.archived)throw new FlowError('Pedido ausente ou arquivado. Restaure antes de alterar a cotação.',409);
 const next={...j,removed:restore?undefined:{at:now,by:actor.name,reason:b.reason},state:restore||j.state==='done'?j.state:'cancelled',updatedAt:now,removalHistory:[...(j.removalHistory||[]),{action:restore?'restore':'remove',at:now,by:actor.name,reason:b.reason}]};
 const open=" AND NOT EXISTS(SELECT 1 FROM records AS closing WHERE closing.kind='budget_closing' AND json_extract(closing.data,'$.month')=COALESCE(?,?) AND json_extract(closing.data,'$.status')='Concluído')";
 const result=await db.batch([
  db.prepare("UPDATE records SET data=?,version=version+1 WHERE id=? AND kind='integration_job' AND version=? AND EXISTS(SELECT 1 FROM records AS request WHERE request.id=? AND request.kind='request' AND request.version=?)"+open).bind(JSON.stringify(next),j.id,j.version,r.id,r.version,r.management?.referenceMonth||null,r.form?.fields.referenceMonth||null),
  db.prepare('INSERT INTO audit(id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),r.id,actor.name,`Cotação ${j.id} ${restore?'restaurada sem reenvio':'excluída para a Lixeira; recibo e mensagem preservados'}: ${b.reason}`,now)
 ]);
 if(result[0].meta.changes!==1)throw new FlowError('Cotação ou pedido atualizado, ou mês fechado. Recarregue.',409);
 return {id:j.id,version:j.version+1};
}
export async function removeQuotationJob(db:D1Database,input:unknown,actor:{role:string;name:string},now:string){return change(db,input,actor,now,false)}
export async function restoreQuotationJob(db:D1Database,input:unknown,actor:{role:string;name:string},now:string){return change(db,input,actor,now,true)}
