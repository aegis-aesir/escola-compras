import {z} from 'zod';
import {FlowError} from '../app/workflow';
import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';

const transitionSchema=z.object({id:z.string().uuid(),version:z.number().int().positive(),reason:z.string().trim().min(5,'Informe um motivo com pelo menos 5 caracteres.').max(1000)});
type ContactRecord={id:string;kind:string;data:string;version:number};
// A failed job is only unambiguous while it has never been attempted or leased.
const pendingQuote=`task.kind='integration_job'
 AND json_extract(task.data,'$.type')='whatsapp_quote'
 AND json_extract(task.data,'$.removed') IS NULL
 AND (json_extract(task.data,'$.state') IN ('queued','blocked','running','uncertain')
 OR (json_extract(task.data,'$.state')='failed' AND (
 COALESCE(json_extract(task.data,'$.attempts'),-1)!=0
 OR json_type(task.data,'$.sentAt') IS NOT NULL
 OR json_type(task.data,'$.providerMessageId') IS NOT NULL
 OR json_type(task.data,'$.leaseToken') IS NOT NULL
 OR json_type(task.data,'$.leaseUntil') IS NOT NULL
 OR json_type(task.data,'$.testSend') IS NOT NULL)))
 AND (json_extract(task.data,'$.manualSelection.recipientId')=?
 OR json_extract(task.data,'$.supplierId')=? OR json_extract(task.data,'$.contactId')=?
 OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(json_extract(task.data,'$.target'),'+',''),' ',''),'-',''),'(',''),')',''),'.','')=?)`;

async function transition(db:D1Database,input:unknown,actor:string,now:string,restore:boolean){
 const b=transitionSchema.parse(input);
 const current=await db.prepare("SELECT id,kind,data,version FROM records WHERE id=? AND kind IN ('supplier','agenda_contact')").bind(b.id).first<ContactRecord>();
 if(!current||current.version!==b.version)throw new FlowError('Contato atualizado. Recarregue a agenda.',409);
 const data=JSON.parse(current.data);
 if(restore?!data.removed:!!data.removed)throw new FlowError(restore?'Contato já restaurado. Recarregue a agenda.':'Contato já excluído; consulte a Lixeira.',409);
 const next={...data,updatedAt:now,updatedBy:actor};
 if(restore)delete next.removed;else next.removed={at:now,by:actor,reason:b.reason};
 // This predicate runs in the write itself. A claim that wins first blocks removal;
 // a removal that wins first invalidates the contact version checked by a claim.
 const write=db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?'+(restore?'':` AND NOT EXISTS(SELECT 1 FROM records AS task WHERE ${pendingQuote})`))
  .bind(JSON.stringify(next),b.id,b.version,...(restore?[]:[b.id,b.id,b.id,(normalizeContactPhone(data.phone)||String(data.phone||'')).replace(/\D/g,'')]));
 const action=(restore?'Contato restaurado da Lixeira; sem envio de mensagens. Motivo: ':'Contato excluído para a Lixeira. Motivo: ')+b.reason;
 const result=await db.batch([write,db.prepare('INSERT INTO audit(id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),b.id,actor,action,now)]);
 if(result[0].meta.changes!==1)throw new FlowError('Contato atualizado ou com cotação pendente. Cancele ou exclua o rascunho da cotação e confira envios em processamento ou incertos antes de excluir o contato.',409);
 return {id:b.id,version:b.version+1};
}
export async function removeAgendaContact(db:D1Database,input:unknown,actor:string,now:string){return transition(db,input,actor,now,false)}
export async function restoreAgendaContact(db:D1Database,input:unknown,actor:string,now:string){return transition(db,input,actor,now,true)}
