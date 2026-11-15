import {z} from 'zod';
import type {AgendaEntry,ContactDraft,ContactImportResult,ContactSource,ContactsSnapshot} from '../app/contact-model';
import {supplierSchema} from '../app/model';
import {FlowError} from '../app/workflow';
import {contactBatchSchema,contactDraftSchema,importSourceSchema} from './contact-validation';
import {contactSyncSnapshot,contactsFromSync} from './contact-sync';
import {normalizedPhone,storedPhoneSql} from './contact-phone-key';
export {removeAgendaContact,restoreAgendaContact} from './contact-removal';

type Saved={id:string;kind:string;data:string;version:number};
const phoneSql=storedPhoneSql();
async function records(db:D1Database){return (await db.prepare("SELECT id,kind,data,version FROM records WHERE kind IN ('supplier','agenda_contact')").all<Saved>()).results;}
function project(row:Saved):AgendaEntry {
 const data=JSON.parse(row.data);return {...data,id:row.id,version:row.version,kind:row.kind,classification:row.kind==='supplier'?'supplier':data.classification||'unclassified',source:data.source||data.agendaSource|| (data.importSource?{kind:'csv',label:data.importSource.source,at:data.importSource.importedAt,actor:data.importSource.importedBy}:undefined)};
}
export async function agendaSnapshot(db:D1Database,now:string):Promise<ContactsSnapshot>{
 const all=(await records(db)).map(project).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const removedEntries=all.filter(entry=>entry.removed),removedPhones=new Set(removedEntries.map(entry=>normalizedPhone(entry.phone)));
 const sync=await contactSyncSnapshot(db,now);
 if(sync.sync)sync.sync={...sync.sync,contacts:sync.sync.contacts.filter(contact=>!removedPhones.has(normalizedPhone(contact.phone)))};
 return {entries:all.filter(entry=>!entry.removed),removedEntries,...sync};
}
function log(db:D1Database,id:string,actor:string,action:string,now:string){return db.prepare('INSERT INTO audit(id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,actor,action,now);}
async function insertContact(db:D1Database,contact:ContactDraft,source:ContactSource){
 const id=crypto.randomUUID(),data={...contact,classification:'unclassified',source,updatedAt:source.at,updatedBy:source.actor};
 const result=await db.batch([db.prepare(`INSERT INTO records(id,kind,data,version) SELECT ?,'agenda_contact',?,1 WHERE NOT EXISTS(SELECT 1 FROM records WHERE kind IN ('supplier','agenda_contact') AND ${phoneSql}=?)`).bind(id,JSON.stringify(data),contact.phone.slice(1)),log(db,id,source.actor,'Contato importado para a agenda; classificação para cotação pendente',source.at)]);
 if(result[0].meta.changes===1)return {id,status:'created' as const};
 const existing=(await records(db)).filter(r=>normalizedPhone(JSON.parse(r.data).phone)===contact.phone);
 return {id:existing[0]?.id||id,status:existing.length===1?'existing' as const:'conflict' as const};
}
export async function importAgendaContacts(db:D1Database,input:unknown,origin:unknown,actor:string,now:string):Promise<ContactImportResult>{
 const contacts=contactBatchSchema.parse(input),source=importSourceSchema.parse(origin);
 return importValidated(db,contacts,{...source,at:now,actor});
}
async function importValidated(db:D1Database,contacts:ContactDraft[],source:ContactSource):Promise<ContactImportResult>{
 const results=[];for(const [index,contact] of contacts.entries())results.push({index,...await insertContact(db,contact,source)});
 return {created:results.filter(r=>r.status==='created').length,existing:results.filter(r=>r.status==='existing').length,conflicts:results.filter(r=>r.status==='conflict').length,results};
}
export async function importSyncedContacts(db:D1Database,id:string,phones:unknown,actor:string,now:string){return importValidated(db,await contactsFromSync(db,id,phones),{kind:'whatsapp',label:'Contatos conhecidos do WhatsApp operacional',at:now,actor});}
const saveSchema=z.object({id:z.string().uuid().optional(),version:z.number().int().positive().optional(),classification:z.enum(['unclassified','general','supplier']),data:contactDraftSchema.extend({contact:z.string().trim().max(100).optional(),scope:z.enum(['local','national']).optional()})});
export async function saveAgendaContact(db:D1Database,input:unknown,actor:string,now:string){
 const b=saveSchema.parse(input);if(!!b.id!==!!b.version)throw new FlowError('Informe o contato e sua versão atual.',400);
 const old=b.id?await db.prepare("SELECT id,kind,data,version FROM records WHERE id=? AND kind IN ('supplier','agenda_contact')").bind(b.id).first<Saved>():null;
 if(b.id&&(!old||old.version!==b.version))throw new FlowError('Contato atualizado. Recarregue.',409);
 if(old&&JSON.parse(old.data).removed)throw new FlowError('Contato na Lixeira. Restaure explicitamente antes de editar.',409);
 if(old?.kind==='supplier'&&b.classification!=='supplier')throw new FlowError('Mantenha a classificação do fornecedor para preservar seus históricos.',409);
 if(b.classification==='supplier'&&!b.data.scope)throw new FlowError('Confirme a abrangência do fornecedor para cotação.',400);
 const previous=old?JSON.parse(old.data):{},source=previous.source||previous.agendaSource||{kind:'manual',label:'Cadastro manual',at:now,actor};
 const kind=b.classification==='supplier'?'supplier':'agenda_contact';
 const data=kind==='supplier'?{...previous,...supplierSchema.parse({...b.data,contact:b.data.contact||''}),company:b.data.company,city:b.data.city,state:b.data.state,agendaSource:source,updatedAt:now,updatedBy:actor}:{...b.data,classification:b.classification,source,updatedAt:now,updatedBy:actor};
 const id=old?.id||crypto.randomUUID();
 const duplicateGuard=` AND NOT EXISTS(SELECT 1 FROM records AS other WHERE other.kind IN ('supplier','agenda_contact') AND ${storedPhoneSql('other')}=? AND other.id!=?)`;
 const processingGuard=" AND NOT EXISTS(SELECT 1 FROM records AS task WHERE task.kind='integration_job' AND COALESCE(json_extract(task.data,'$.manualSelection.recipientId'),json_extract(task.data,'$.supplierId'))=? AND json_extract(task.data,'$.type')='whatsapp_quote' AND json_extract(task.data,'$.state') IN ('running','uncertain'))";
 const changedPhone=old&&normalizedPhone(previous.phone)!==b.data.phone;
 const write=old?db.prepare('UPDATE records SET kind=?,data=?,version=version+1 WHERE id=? AND version=?'+duplicateGuard+(changedPhone?processingGuard:'')).bind(kind,JSON.stringify(data),id,old.version,b.data.phone.slice(1),id,...(changedPhone?[id]:[])):db.prepare('INSERT INTO records(id,kind,data,version) SELECT ?,?,?,1 WHERE 1=1'+duplicateGuard).bind(id,kind,JSON.stringify(data),b.data.phone.slice(1),id);
 const result=await db.batch([write,log(db,id,actor,kind==='supplier'?'Classificação e cadastro do fornecedor conferidos na agenda':'Contato salvo na agenda; sem envio de mensagens',now)]);
 if(result[0].meta.changes!==1){
  if(changedPhone&&await db.prepare("SELECT id FROM records WHERE kind='integration_job' AND COALESCE(json_extract(data,'$.manualSelection.recipientId'),json_extract(data,'$.supplierId'))=? AND json_extract(data,'$.state') IN ('running','uncertain') LIMIT 1").bind(id).first())throw new FlowError('Há envio em processamento ou incerto. Confira antes de alterar o telefone.',409);
  throw new FlowError('Contato atualizado ou telefone já cadastrado. Recarregue a agenda.',409);
 }
 return {id,version:(old?.version||0)+1};
}
