import {z} from 'zod';
import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';
import type {Purchase} from '../app/model';
import type {AgendaEntry} from '../app/contact-model';
import type {IntegrationJob} from '../app/integration-model';
import {hasAmbiguousQuotation} from '../app/integration-model';
import {lastSentQuotation} from '../app/quotation-history';
import type {QuotationContactsSnapshot} from '../app/quotation-contact-model';
import {buildQuotationContactChoices} from '../app/quotation-contact-selection';
import {FlowError} from '../app/workflow';
import {budgetMonth} from '../app/budget';
import {agendaSnapshot,importSyncedContacts} from './contact-agenda';
import {contactsFromSync} from './contact-sync';
import {row,rows,enqueueManualQuotation,type IntegrationEnv} from './integrations';

function allowed(request:Purchase){if(request.archived||!request.generalApproval||!['quoting','national'].includes(request.status))throw new FlowError('A escolha de contatos exige pedido aprovado e em cotação.',409);}
async function currentRequest(db:D1Database,request:Purchase){
 allowed(request);
 const current=await row<Purchase>(db,request.id,'request');
 if(!current||current.version!==request.version)throw new FlowError('Solicitação atualizada. Reabra a seleção.',409);
 allowed(current);
 const month=budgetMonth(current);
 if(month&&await db.prepare("SELECT id FROM records WHERE kind='budget_closing' AND json_extract(data,'$.month')=? AND json_extract(data,'$.status')='Concluído' LIMIT 1").bind(month).first())throw new FlowError('O mês está fechado. Reabra antes de preparar contatos.',409);
 return current;
}
export async function quotationContactsSnapshot(db:D1Database,request:Purchase,now:string):Promise<QuotationContactsSnapshot>{
 const current=await currentRequest(db,request),agenda=await agendaSnapshot(db,now);
 const jobs=await rows<IntegrationJob>(db,'integration_job');
 const removedPhones=new Set((agenda.removedEntries||[]).map(c=>normalizeContactPhone(c.phone)));
 const sync=agenda.sync?{...agenda.sync,contacts:agenda.sync.contacts.filter(c=>!removedPhones.has(normalizeContactPhone(c.phone)))}:undefined;
 const choices=buildQuotationContactChoices(current,agenda.entries,sync).map(c=>{
  const related=jobs.filter(j=>j.type==='whatsapp_quote'&&j.requestId===current.id&&j.target===c.phone),lastSent=lastSentQuotation(related,current.id,c.phone);
  const latest=[...related].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))[0];
  const disabledReason=c.disabledReason||(related.some(hasAmbiguousQuotation)?'Há resultado de envio ambíguo. Confira o histórico antes de uma nova tentativa.':latest&&!latest.removed&&latest.state==='cancelled'&&!lastSent?'Cotação cancelada. Exclua o registro em Agente WhatsApp antes de preparar novamente.':undefined);
  return {...c,lastSent,disabledReason,recommended:c.recommended&&!disabledReason};
 });
 return {requestId:current.id,requestVersion:current.version,choices};
}
const resendRef=z.object({id:z.string().min(1).max(100),version:z.number().int().positive()});
const selectionSchema=z.array(z.discriminatedUnion('kind',[
 z.object({kind:z.literal('saved'),id:z.string().uuid(),version:z.number().int().positive(),phone:z.string().min(7).max(16),resendOf:resendRef.optional()}),
 z.object({kind:z.literal('sync'),syncId:z.string().uuid(),phone:z.string().min(7).max(16),resendOf:resendRef.optional()})
])).min(1,'Selecione ao menos um contato.').max(100,'Prepare até 100 contatos por vez.');
export async function enqueueSelectedContacts(db:D1Database,request:Purchase,input:unknown,actor:string,now:string,env:IntegrationEnv,preparationId?:string){
 if(preparationId!==undefined)z.string().uuid().parse(preparationId);
 const selections=selectionSchema.parse(input),current=await currentRequest(db,request),snapshot=await quotationContactsSnapshot(db,current,now);
 const prepared=preparationId?await rows<IntegrationJob>(db,'integration_job'):[];
 const seen=new Set<string>();
 // Validate every reference before any import or quotation write. No client names,
 // classifications or arbitrary phone numbers become trusted recipients.
 const choices=await Promise.all(selections.map(async selection=>{
  let choice=snapshot.choices.find(c=>c.selection.kind===selection.kind&&c.phone===selection.phone&&(selection.kind==='saved'&&c.selection.kind==='saved'?c.selection.id===selection.id&&c.selection.version===selection.version:selection.kind==='sync'&&c.selection.kind==='sync'&&c.selection.syncId===selection.syncId));
  if(!choice&&selection.kind==='sync'){
   // Retry after the selected preview contact was saved by an earlier attempt:
   // still require this exact current preview; never accept a retired sync ID.
   await contactsFromSync(db,selection.syncId,[selection.phone]);
   const saved=snapshot.choices.find(c=>c.selection.kind==='saved'&&c.phone===selection.phone);
   if(saved)choice={...saved,selection};
  }
  if(!choice||choice.disabledReason)throw new FlowError('Contato atualizado ou indisponível. Reabra a seleção.',409);
  // Validate consent for the entire selection before saving/importing any recipient.
  // A repeated preparation UUID is validated idempotently in the enqueue function.
  const prior=prepared.find(j=>j.requestId===current.id&&j.target===choice.phone&&j.preparationId===preparationId);
  if(!prior&&choice.lastSent&&(!selection.resendOf||selection.resendOf.id!==choice.lastSent.id||selection.resendOf.version!==choice.lastSent.version))throw new FlowError('Cotação já enviada para '+choice.name+'. Confirme o reenvio após conferir a data e o contato.',409);
  if(seen.has(choice.phone))throw new FlowError('Contato repetido na seleção.',400);seen.add(choice.phone);return choice;
 }));
 const ids:string[]=[];
 for(const choice of choices){
  let id:string;
  if(choice.selection.kind==='saved')id=choice.selection.id;
  else {
   const imported=await importSyncedContacts(db,choice.selection.syncId,[choice.phone],actor,now);
   const result=imported.results[0];if(result.status==='conflict')throw new FlowError('Telefone com cadastros conflitantes. Confira a agenda.',409);id=result.id;
  }
  const saved=await db.prepare("SELECT id,kind,data,version FROM records WHERE id=? AND kind IN ('supplier','agenda_contact')").bind(id).first<{id:string;kind:'supplier'|'agenda_contact';data:string;version:number}>();
  if(!saved)throw new FlowError('Contato indisponível. Reabra a seleção.',409);
  const recipient={...JSON.parse(saved.data),id:saved.id,kind:saved.kind,version:saved.version} as AgendaEntry;
  if(choice.selection.kind==='saved'&&recipient.version!==choice.selection.version)throw new FlowError('Contato atualizado. Reabra a seleção.',409);
  if(normalizeContactPhone(recipient.phone)!==choice.phone)throw new FlowError('Telefone atualizado. Reabra a seleção.',409);
  const selected=selections.find(s=>s.phone===choice.phone)!;
  ids.push(await enqueueManualQuotation(db,current,recipient,actor,now,env,choice.recommended,{preparationId,resendOf:selected.resendOf}));
 }
 return ids;
}
