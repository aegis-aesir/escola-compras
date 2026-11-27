import {classifyEvidence,classifyFreight} from '../integrations/openclaw/price-evidence.mjs';
import {schoolFreightDestination} from '../app/school-destination';
import { z } from 'zod';
import { type Purchase, type Item, type Supplier, type Settings, quotationMessage, quotationMessageTemplate, categorySchema, supplierSchema } from '../app/model';
import {estimateFromLines,freightPolicy,type EstimateLine} from '../app/estimate-lines';
import {estimateCriteriaSchema,savedItemCriteria,itemResearchTarget,isCurrentEstimateJob} from '../app/estimate-criteria';
import { categoryKey, compatibleQuotationSuppliers, matchingSuppliers, requestSupplierCategories, supplierSearchTerms } from '../app/supplier-discovery';
import { FlowError, localExpired, nextBusinessDay, transition } from '../app/workflow';
import type { IntegrationJob, IntegrationSnapshot, InboxMessage } from '../app/integration-model';
import {canCancelQuotationJob,hasAmbiguousQuotation} from '../app/integration-model';
import type {AgendaEntry} from '../app/contact-model';
import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';
import {storedPhoneSql} from './contact-phone-key';
import {pairedTestSendGrant,matchesTestSendJob} from '../integrations/openclaw/test-send-grant.mjs';
import {lastSentQuotation} from '../app/quotation-history';

type Row<T> = T & {id:string;version:number};
export type IntegrationEnv = {DB?:D1Database;BUCKET?:R2Bucket;INTEGRATION_SECRET?:string;WHATSAPP_SEND_ENABLED?:string;WHATSAPP_TEST_SEND_GRANT?:string};
export const accountId = 'operacional';
export const schoolPhone = '+559292017107';
const jobKind = 'integration_job';
const inboxKind = 'integration_inbox';
const maxAttempts = 3;
const relatedQuotationGuard=" AND NOT EXISTS(SELECT 1 FROM records AS previous WHERE previous.kind='integration_job' AND json_extract(previous.data,'$.type')='whatsapp_quote' AND json_extract(previous.data,'$.requestId')=? AND json_extract(previous.data,'$.target')=? AND NOT EXISTS(SELECT 1 FROM json_each(?) AS expected WHERE json_extract(expected.value,'$.id')=previous.id AND json_extract(expected.value,'$.version')=previous.version))";
const addMs = (at:string,ms:number)=>new Date(Date.parse(at)+ms).toISOString();
const phone = (value:string)=>normalizeContactPhone(value)||'+'+value.replace(/\D/g,'');
export async function rows<T>(db:D1Database,kind:string):Promise<Row<T>[]> {
  const result=await db.prepare('SELECT id,data,version FROM records WHERE kind=?').bind(kind).all<{id:string;data:string;version:number}>();
  return result.results.map(r=>({...JSON.parse(r.data),id:r.id,version:r.version}));
}
export async function row<T>(db:D1Database,id:string,kind:string):Promise<Row<T>|null> {
  const r=await db.prepare('SELECT id,data,version FROM records WHERE id=? AND kind=?').bind(id,kind).first<{id:string;data:string;version:number}>();
  return r?{...JSON.parse(r.data),id:r.id,version:r.version}:null;
}
function audit(db:D1Database,entity:string,actor:string,action:string,at:string) {
  return db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),entity,actor,action,at);
}
async function insert(db:D1Database,id:string,kind:string,data:object,entity:string,actor:string,action:string,at:string) {
  const guard=kind==='supplier'?` WHERE NOT EXISTS(SELECT 1 FROM records WHERE kind IN ('supplier','agenda_contact') AND ${storedPhoneSql()}=?)`:'';
  const result=await db.batch([db.prepare('INSERT OR IGNORE INTO records (id,kind,data,version) SELECT ?,?,?,1'+guard).bind(id,kind,JSON.stringify(data),...(kind==='supplier'?[phone((data as Supplier).phone).slice(1)]:[])),audit(db,entity,actor,action,at)]);
  return result[0].meta.changes===1;
}
async function update(db:D1Database,old:{id:string;version:number},data:object,entity:string,actor:string,action:string,at:string,guards:{id:string;version:number}[]=[],monthRequestId=old.id,quotationGuard?:{requestId:string;target:string;jobs:{id:string;version:number}[]}) {
  const openMonth=" AND NOT EXISTS(SELECT 1 FROM records AS target JOIN records AS closing ON closing.kind='budget_closing' AND json_extract(closing.data,'$.month')=COALESCE(json_extract(target.data,'$.management.referenceMonth'),json_extract(target.data,'$.form.fields.referenceMonth')) WHERE target.id=? AND target.kind='request' AND json_extract(closing.data,'$.status')='Concluído')";
  const sql='UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?'+openMonth+guards.map(()=> ' AND EXISTS (SELECT 1 FROM records AS guard WHERE guard.id=? AND guard.version=?)').join('')+(quotationGuard?relatedQuotationGuard:'');
  const result=await db.batch([db.prepare(sql).bind(JSON.stringify(data),old.id,old.version,monthRequestId,...guards.flatMap(g=>[g.id,g.version]),...(quotationGuard?[quotationGuard.requestId,quotationGuard.target,JSON.stringify(quotationGuard.jobs.map(({id,version})=>({id,version})))]:[])),audit(db,entity,actor,action,at)]);
  return result[0].meta.changes===1;
}
export async function digest(value:string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function eligible(r:Purchase,j:Pick<IntegrationJob,'type'|'supplierId'|'category'|'estimateRevision'>&Partial<IntegrationJob>,suppliers:Supplier[],contacts:AgendaEntry[]=[]) {
  if(r.archived||j.removed)return false;
  if(j.type==='estimate_search'){
    if(r.status==='admin_review')return 'id' in j&&isCurrentEstimateJob(r,j as IntegrationJob)&&!!j.researchCriteria&&searchingLine(r,j.itemIndex??0)?.searchRevision===j.researchCriteria.revision;
    return r.status==='estimating'&&('id' in j?isCurrentEstimateJob(r,j as IntegrationJob):(j.estimateRevision||'')===(r.estimateRevision||''));
  }
  if(!r.generalApproval)return false;
  if(j.type==='national_search'||j.type==='local_supplier_search')return r.status===(j.type==='national_search'?'national':'quoting')&&!!j.category&&requestSupplierCategories(r).some(c=>categoryKey(c.category)===categoryKey(j.category!));
  if(j.type==='whatsapp_quote'&&j.manualSelection){const recipient=[...suppliers,...contacts].find(c=>c.id===j.manualSelection!.recipientId);return !!recipient&&!recipient.removed&&['quoting','national'].includes(r.status)&&normalizeContactPhone(recipient.phone)===j.target&&j.target!==schoolPhone;}
  const s=suppliers.find(s=>s.id===j.supplierId);
  return !!s&&compatibleQuotationSuppliers(r,[s]).length>0;
}
// Linha do produto com nova busca em andamento na revisão da estimativa (ticket 04).
function searchingLine(r:Pick<Purchase,'estimate'>,itemIndex:number){
  const l=r.estimate?.lines?.find(l=>l.kind==='product'&&l.itemIndex===itemIndex);
  return l?.searchRevision?l:undefined;
}
// Configuração da estimativa do Master (ticket 06): percentual padrão de frete.
async function schoolSettings(db:D1Database):Promise<Settings|undefined>{
  const school=await db.prepare('SELECT data FROM school WHERE id=1').first<{data:string}>();
  return school?JSON.parse(school.data):undefined;
}
export async function estimateSearchId(r:Purchase,index:number){
  const criteria=savedItemCriteria(r,index);
  return 'search:'+await digest(JSON.stringify(['prices-agent-v1',r.id,'estimate_search',index,r.items[index],...(r.estimateRevision?[r.estimateRevision]:[]),...(criteria?['criteria-v1',criteria.revision]:[])]));
}
export async function configureEstimateResearch(db:D1Database,r:Purchase,input:unknown,itemIndex:number|undefined,actor:string,now:string){
  if(r.archived||r.generalApproval||!['pending','estimating','admin_review'].includes(r.status))throw new FlowError('Os critérios só podem ser alterados antes do encaminhamento à Diretoria Geral.',409);
  const entries=itemIndex===undefined?z.array(estimateCriteriaSchema).length(r.items.length).parse(input).map((criteria,index)=>({index,criteria})):[{index:z.number().int().min(0).max(r.items.length-1).parse(itemIndex),criteria:estimateCriteriaSchema.parse(input)}];
  // Revisão da estimativa por item: refazer um item mantém a revisão e as demais linhas.
  if(itemIndex!==undefined&&r.status==='admin_review'&&Array.isArray(r.estimate?.lines))return researchEstimateItem(db,r,entries[0],actor,now);
  const next:Purchase={...r,status:'estimating',updatedAt:now,estimateCriteria:{...r.estimateCriteria},estimateCriteriaHistory:[...(r.estimateCriteriaHistory||[])]};
  for(const {index,criteria} of entries){const saved={...criteria,revision:crypto.randomUUID(),actor,at:now,sourceItem:r.items[index]};next.estimateCriteria![index]=saved;next.estimateCriteriaHistory!.push({itemIndex:index,actor,at:now,criteria:saved,previous:savedItemCriteria(r,index),...(r.estimate?{previousEstimate:r.estimate}:{})});}
  delete next.estimate;delete next.adminReview;
  if(!await update(db,r,next,r.id,actor,'Critérios de estimativa autorizados; pesquisa iniciada para '+entries.map(e=>r.items[e.index].name).join(', ').slice(0,500),now))throw new FlowError('Solicitação atualizada ou mês fechado. Recarregue.',409);
  await enqueueSearch(db,{...next,version:r.version+1},actor,now);
}
// Ticket 04 (E1): nova busca de um item na revisão da estimativa. A solicitação fica em
// admin_review; a linha do item passa a pendência em andamento ligada à nova revisão do
// critério, e só a tarefa desse item é enfileirada. Tarefas anteriores do item têm outro
// id (a revisão do critério entra no id) e deixam de ser elegíveis.
async function researchEstimateItem(db:D1Database,r:Purchase,{index,criteria}:{index:number;criteria:z.infer<typeof estimateCriteriaSchema>},actor:string,now:string){
  const e=r.estimate!,lines=[...e.lines!];
  const saved={...criteria,revision:crypto.randomUUID(),actor,at:now,sourceItem:r.items[index]};
  const at=lines.findIndex(l=>l.kind==='product'&&l.itemIndex===index),previous=lines[at]||{kind:'product' as const,itemIndex:index,value:null,origin:'pending' as const,at:e.recordedAt};
  const line:EstimateLine={kind:'product',itemIndex:index,value:null,origin:'pending',reason:'Nova busca em andamento',searchRevision:saved.revision,author:actor,at:now};
  if(at<0)lines.push(line);else lines[at]=line;
  const next:Purchase={...r,updatedAt:now,estimateCriteria:{...r.estimateCriteria,[index]:saved},
    estimateCriteriaHistory:[...(r.estimateCriteriaHistory||[]),{itemIndex:index,actor,at:now,criteria:saved,previous:savedItemCriteria(r,index),previousEstimate:e}],
    estimate:estimateFromLines(lines,r.items,{notes:e.notes,recordedAt:e.recordedAt,method:e.method},freightPolicy(r,await schoolSettings(db))),
    estimateEditHistory:[...(r.estimateEditHistory||[]),{itemIndex:index,actor,at:now,previous,line,action:'research'}]};
  if(!await update(db,r,next,r.id,actor,'Revisão da estimativa: nova busca solicitada para '+r.items[index].name.slice(0,300),now))throw new FlowError('Solicitação atualizada ou mês fechado. Recarregue.',409);
  const job=await estimateJob({...next,version:r.version+1},index,'estimate_search',now);
  await insert(db,job.id,jobKind,job,r.id,actor,`Pesquisa enfileirada: ${r.items[index].name}`,now);
}
async function estimateJob(r:Purchase,itemIndex:number,type:IntegrationJob['type'],now:string):Promise<Omit<IntegrationJob,'version'>>{
  const item=r.items[itemIndex],criteria=savedItemCriteria(r,itemIndex),researchItem=itemResearchTarget(item,criteria);
  const query=`${criteria?.searchName||item.name} ${researchItem.spec} ${item.unit} preço comprar Brasil`.slice(0,3000);
  return {id:await estimateSearchId(r,itemIndex),requestId:r.id,type,estimateRevision:r.estimateRevision,itemIndex,item,...(criteria?{researchCriteria:criteria,researchItem}:{}),query,state:'queued',createdAt:now,updatedAt:now,attempts:0,nextAttemptAt:now};
}
export async function enqueueSearch(db:D1Database,r:Purchase,actor:string,now:string) {
  if(['quoting','national'].includes(r.status))return enqueueSupplierSearch(db,r,actor,now);
  const type=r.status==='national'?'national_search':'estimate_search';
  if(!eligible(r,{type,estimateRevision:r.estimateRevision},[]))throw new FlowError('Pesquisa indisponível nesta etapa.');
  let created=0;
  for(const [itemIndex,item] of r.items.entries()) {
    const data=await estimateJob(r,itemIndex,type,now),id=data.id;
    const existing=await row<IntegrationJob>(db,id,jobKind);
    if(existing?.state==='review'&&existing.item&&!existing.analysisReason&&!existing.priceEvidence) {
      if(await update(db,existing,{...data,createdAt:existing.createdAt},r.id,actor,'Pesquisa anterior sem análise estruturada reenfileirada',now))created++;
    }else if(await insert(db,id,jobKind,data,r.id,actor,`Pesquisa enfileirada: ${item.name}`,now))created++;
  }
  return created;
}

export async function startEstimateSearch(db:D1Database,r:Purchase,actor:string,now:string) {
  if(r.archived||r.status!=='pending'||r.estimate)throw new FlowError('A estimativa só pode ser iniciada pela Diretoria Administrativa antes da pesquisa.',409);
  const next:Purchase={...r,status:'estimating',updatedAt:now};
  if(!await update(db,r,next,r.id,actor,'Diretoria administrativa iniciou a estimativa automática na internet',now))throw new FlowError('Solicitação atualizada. Recarregue.',409);
  return enqueueSearch(db,{...next,version:r.version+1},actor,now);
}
export async function enqueueSupplierSearch(db:D1Database,r:Purchase,actor:string,now:string) {
  const type=r.status==='national'?'national_search':'local_supplier_search';
  if(r.archived||!r.generalApproval||r.status!==(type==='national_search'?'national':'quoting'))throw new FlowError('A busca de fornecedores exige aprovação e a etapa correspondente.');
  const scope=type==='local_supplier_search'?'local':'national';
  const suppliers=await rows<Supplier>(db,'supplier');
  let created=0;
  for(const {category,itemIndex} of requestSupplierCategories(r)) {
    if(matchingSuppliers(suppliers,category,scope).length)continue;
    const query=`${supplierSearchTerms(r,category)} fornecedores ${scope==='local'?'Manaus AM loja endereço telefone':'Brasil entrega Manaus AM contato'}`;
    const id='supplier-search:'+await digest(JSON.stringify([r.id,type,categoryKey(category)]));
    const job:Omit<IntegrationJob,'version'>={id,requestId:r.id,type,category,itemIndex,query,state:'queued',createdAt:now,updatedAt:now,attempts:0,nextAttemptAt:now};
    const existing=await row<IntegrationJob>(db,id,jobKind);
    if(existing?.state==='cancelled') {
      if(await update(db,existing,{...job,createdAt:existing.createdAt},r.id,actor,`Busca retomada sem fornecedor cadastrado: ${category}`,now))created++;
    }else if(await insert(db,id,jobKind,job,r.id,actor,`Sem fornecedor ${scope==='local'?'local':'nacional'} cadastrado para ${category}; busca web enfileirada`,now))created++;
  }
  return created;
}
export async function setSupplierCategories(db:D1Database,r:Purchase,input:unknown,actor:string,now:string) {
  if(r.archived)throw new FlowError('Solicitação arquivada.',409);
  if(!['estimating','pending','admin_review','general_review','quoting','national'].includes(r.status))throw new FlowError('A etapa não permite alterar categorias.');
  const categories=z.array(categorySchema).length(r.items.length).parse(input);
  const next={...r,items:r.items.map((item,i)=>({...item,category:categories[i]})),updatedAt:now};
  if(!await update(db,r,next,r.id,actor,'Categorias dos itens conferidas para busca de fornecedores',now))throw new FlowError('Pedido atualizado. Recarregue.',409);
  if(r.generalApproval&&['quoting','national'].includes(r.status))await enqueueSupplierSearch(db,next,actor,now);
}
export async function registerDiscoveredSupplier(db:D1Database,jobId:string,sourceIndex:number,input:unknown,actor:string,now:string) {
  const j=await row<IntegrationJob>(db,jobId,jobKind);
  if(!j||!['local_supplier_search','national_search'].includes(j.type)||j.state!=='review'||!j.category||!j.researchedAt)throw new FlowError('Selecione uma pesquisa de fornecedores concluída.');
  const r=await row<Purchase>(db,j.requestId,'request');
  if(!r||!eligible(r,j,[]))throw new FlowError('A pesquisa não corresponde à etapa e às categorias atuais.');
  const index=z.number().int().nonnegative().parse(sourceIndex),source=j.sources?.[index];
  if(!source)throw new FlowError('Fonte não encontrada.');
  const fields=z.object({name:z.string(),phone:z.string(),contact:z.string().default('')}).parse(input);
  const data=supplierSchema.parse({...fields,category:j.category,scope:j.type==='local_supplier_search'?'local':'national'});
  const existing=(await rows<Supplier>(db,'supplier')).find(s=>phone(s.phone)===phone(data.phone));
  if(existing) {
    if(matchingSuppliers([existing],data.category,data.scope).length)return existing.id;
    throw new FlowError('Este telefone já está cadastrado em outra categoria ou abrangência. Confira o cadastro existente.');
  }
  if((await rows<{phone:string}>(db,'agenda_contact')).some(c=>phone(c.phone)===phone(data.phone)))throw new FlowError('Este telefone já consta na agenda. Classifique o contato existente como fornecedor.',409);
  const hash=await digest(phone(data.phone));
  const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  const created=await insert(db,id,'supplier',{...data,discovery:{sourceUrl:source.url,researchedAt:j.researchedAt,reviewedAt:now,reviewedBy:actor,jobId}},r.id,actor,`Fornecedor cadastrado após conferência da pesquisa: ${data.name}`,now);
  if(!created) {
    const winner=(await rows<Supplier>(db,'supplier')).find(s=>phone(s.phone)===phone(data.phone));
    if(!winner||!matchingSuppliers([winner],data.category,data.scope).length)throw new FlowError('Este telefone foi cadastrado simultaneamente em outra categoria ou abrangência. Recarregue e confira.',409);
    return winner.id;
  }
  return id;
}
export async function enqueueQuotation(db:D1Database,r:Purchase,s:Supplier,actor:string,now:string,env:IntegrationEnv) {
  if(!eligible(r,{type:'whatsapp_quote',supplierId:s.id},[s]))throw new FlowError('A cotação exige aprovação da necessidade e fornecedor permitido nesta etapa.');
  return enqueueManualQuotation(db,r,{...s,kind:'supplier',classification:'supplier'},actor,now,env,true,{legacy:true});
}
export async function enqueueQuotations(db:D1Database,r:Purchase,suppliers:Supplier[],input:unknown,actor:string,now:string,env:IntegrationEnv) {
  const ids=z.array(z.string().uuid()).min(1,'Selecione ao menos um fornecedor.').max(100,'Prepare até 100 fornecedores por vez.').refine(values=>new Set(values).size===values.length,'Seleção de fornecedores repetida.').parse(input);
  const compatible=new Map(compatibleQuotationSuppliers(r,suppliers).map(match=>[match.supplier.id,match.supplier]));
  const selected=ids.map(id=>{const supplier=compatible.get(id);if(!supplier)throw new FlowError('Fornecedor não compatível ou indisponível nesta etapa. Reabra a seleção.',409);return supplier});
  // Validar o lote inteiro antes de gravar. Repetições usam a idempotência por pedido/telefone.
  for(const supplier of selected)if(!/^\+[1-9]\d{9,14}$/.test(phone(supplier.phone)))throw new FlowError('Confira os telefones dos fornecedores selecionados.');
  const jobs:string[]=[];
  for(const supplier of selected)jobs.push(await enqueueQuotation(db,r,supplier,actor,now,env));
  return jobs;
}
export async function enqueueManualQuotation(db:D1Database,r:Purchase,recipient:AgendaEntry,actor:string,now:string,env:IntegrationEnv,suggested:boolean,options:{preparationId?:string;resendOf?:{id:string;version:number};legacy?:boolean}={}){
  if(r.archived||!r.generalApproval||!['quoting','national'].includes(r.status))throw new FlowError('A escolha de contatos exige pedido aprovado e em cotação.',409);
  const target=normalizeContactPhone(recipient.phone);if(recipient.removed||!target||!/^\+[1-9]\d{9,14}$/.test(target)||target===schoolPhone)throw new FlowError('Confira o contato e seu telefone.',400);
  if(options.preparationId)z.string().uuid().parse(options.preparationId);
  const related=(await rows<IntegrationJob>(db,jobKind)).filter(j=>j.type==='whatsapp_quote'&&j.requestId===r.id&&j.target===target);
  if(related.some(hasAmbiguousQuotation))throw new FlowError('Há histórico de envio ambíguo para este contato. Confira o WhatsApp e os recibos antes de uma nova tentativa.',409);
  const repeated=options.preparationId&&related.find(j=>j.preparationId===options.preparationId);
  if(repeated){if(repeated.removed)throw new FlowError('Este preparo foi excluído. Reabra a seleção para um novo preparo.',409);return repeated.id;}
  if(related.some(j=>j.state==='uncertain'))throw new FlowError('Há envio incerto para este contato. Confira o WhatsApp antes de uma nova tentativa.',409);
  const sent=lastSentQuotation(related,r.id,target);
  if(sent&&(!options.preparationId||options.resendOf?.id!==sent.id||options.resendOf?.version!==sent.version))throw new FlowError('Cotação já enviada para este contato. A confirmação de reenvio está ausente ou atualizada. Reabra a seleção.',409);
  const active=related.find(j=>!j.removed&&['queued','running','blocked'].includes(j.state));
  if(active){
    if(active.state==='blocked'&&options.preparationId&&env.WHATSAPP_SEND_ENABLED==='true'){
      if(!canCancelQuotationJob(active))throw new FlowError('Este rascunho exige conferência antes de enviar.',409);
      const contact=recipient.contact||recipient.name,text=quotationMessageTemplate(r);
      const next={...active,accountId,schoolPhone,supplierId:recipient.kind==='supplier'?recipient.id:undefined,contactId:recipient.kind==='agenda_contact'?recipient.id:undefined,supplierName:recipient.name,state:'queued',preparationId:options.preparationId,resendOf:options.resendOf,updatedAt:now,message:quotationMessage(r,{...recipient,contact} as Supplier),quotationTemplate:{version:'contact-v1' as const,text,contact},messageHistory:[...(active.messageHistory||[]),{message:active.message,quotationTemplate:active.quotationTemplate,at:now,reason:'Novo preparo explícito do usuário; texto anterior preservado'}],manualSelection:{recipientId:recipient.id,actor,at:now,suggested}};
      if(!await update(db,active,next,r.id,actor,'Rascunho escolhido explicitamente colocado na fila de envio',now,[r,recipient],r.id,{requestId:r.id,target,jobs:related}))throw new FlowError('Pedido, recibo ou contato atualizado, ou mês fechado. Reabra a seleção.',409);
    }
    return active.id;
  }
  const latest=[...related].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))[0];
  if(latest&&!latest.removed&&latest.state==='cancelled'&&!sent)throw new FlowError('A cotação foi cancelada. Exclua o registro da lista antes de preparar novamente.',409);
  const id='whatsapp:'+await digest(JSON.stringify(options.preparationId?[r.id,target,'manual-v2',options.preparationId]:[r.id,target,r.generalApproval.at,...(related.length?related.map(j=>[j.id,j.version]):[])]));
  const contact=recipient.contact||recipient.name,template=quotationMessageTemplate(r);
  const job={id,requestId:r.id,type:'whatsapp_quote',supplierId:recipient.kind==='supplier'?recipient.id:undefined,contactId:recipient.kind==='agenda_contact'?recipient.id:undefined,supplierName:recipient.name,target,accountId,schoolPhone,message:quotationMessage(r,{...recipient,contact} as Supplier),quotationTemplate:{version:'contact-v1',text:template,contact},manualSelection:options.legacy?undefined:{recipientId:recipient.id,actor,at:now,suggested},preparationId:options.preparationId,resendOf:sent?options.resendOf:undefined,state:env.WHATSAPP_SEND_ENABLED==='true'?'queued':'blocked',createdAt:now,updatedAt:now,attempts:0,nextAttemptAt:now};
  const guard=" WHERE EXISTS(SELECT 1 FROM records AS request WHERE request.id=? AND request.kind='request' AND request.version=?) AND EXISTS(SELECT 1 FROM records AS contact WHERE contact.id=? AND contact.version=? AND contact.kind IN ('supplier','agenda_contact') AND json_extract(contact.data,'$.removed') IS NULL) AND NOT EXISTS(SELECT 1 FROM records AS closing WHERE closing.kind='budget_closing' AND json_extract(closing.data,'$.month')=COALESCE(?,?) AND json_extract(closing.data,'$.status')='Concluído')"+relatedQuotationGuard;
  const result=await db.batch([db.prepare('INSERT OR IGNORE INTO records(id,kind,data,version) SELECT ?,?,?,1'+guard).bind(id,jobKind,JSON.stringify(job),r.id,r.version,recipient.id,recipient.version,r.management?.referenceMonth||null,r.form?.fields.referenceMonth||null,r.id,target,JSON.stringify(related.map(({id,version})=>({id,version})))),audit(db,r.id,actor,sent?'Reenvio confirmado explicitamente; novo registro e recibo independente':'Cotação preparada para contato escolhido explicitamente; envio depende das duas liberações',now)]);
  if(result[0].meta.changes!==1){const existing=await row<IntegrationJob>(db,id,jobKind);if(existing&&!existing.removed)return id;throw new FlowError('Cotação, pedido ou contato atualizado, ou mês fechado. Reabra a seleção antes de reenviar.',409);}
  return id;
}
// Called by both the authenticated panel and the independent bridge, using the
// same version check. No migration or change to existing purchase records needed.
export async function advanceDeadlines(db:D1Database,now:string) {
  let changed=0;
  for(const r of await rows<Purchase>(db,'request')) {
    if(!r.generalApproval||!localExpired(r,now))continue;
    const next={...r,status:'national',nationalReason:'1 dia útil sem proposta local válida',updatedAt:now};
    if(await update(db,r,next,r.id,'Sistema','Prazo local vencido; pesquisa nacional liberada',now))changed++;
  }
  return changed;
}
export async function integrationSnapshot(db:D1Database,env:IntegrationEnv):Promise<IntegrationSnapshot> {
  const state=await row<{lastSeenAt:string}>(db,'integration:heartbeat','integration_state');
  const jobs=await rows<IntegrationJob>(db,jobKind);
  return {provider:'OpenClaw',accountId,schoolPhone,bridgeConfigured:(env.INTEGRATION_SECRET?.length||0)>=32,sendingEnabled:env.WHATSAPP_SEND_ENABLED==='true',lastSeenAt:state?.lastSeenAt,jobs:jobs.map(({leaseToken,leaseUntil,...j})=>j),inbox:await rows<InboxMessage>(db,inboxKind)};
}
export async function retryJob(db:D1Database,id:string,version:number,actor:string,now:string) {
  const j=await row<IntegrationJob>(db,id,jobKind);
  if(!j||j.removed||j.version!==version)throw new FlowError('Tarefa atualizada ou excluída. Recarregue o painel.',409);
  if(j.type==='whatsapp_quote')throw new FlowError('Para enviar ou reenviar uma cotação, abra a solicitação, escolha os contatos e confira o aviso de envio anterior.',409);
  // Uncertain sends can never be retried automatically or through this action.
  if(!['failed','blocked'].includes(j.state)&&!(j.type==='estimate_search'&&j.state==='review'))throw new FlowError('Esta tarefa não permite nova tentativa.');
  const r=await row<Purchase>(db,j.requestId,'request');
  if(!r||!eligible(r,j,await rows<Supplier>(db,'supplier'),await rows<AgendaEntry>(db,'agenda_contact')))throw new FlowError('A etapa do pedido não permite esta tarefa.');
  if(!await update(db,j,{...j,state:'queued',attempts:0,error:undefined,priceEvidence:undefined,sources:undefined,researchedAt:undefined,updatedAt:now,nextAttemptAt:now},j.requestId,actor,'Nova tentativa de integração solicitada',now,[],j.manualSelection?r.id:j.id))throw new FlowError('Tarefa atualizada. Recarregue.',409);
}
export async function cancelQuotationJobs(db:D1Database,input:unknown,note:unknown,actor:{role:string;name:string},now:string){
  if(!['admin','administrativo'].includes(actor.role))throw new FlowError('Seu perfil não permite cancelar tarefas.',403);
  const selected=z.array(z.object({id:z.string().regex(/^whatsapp:[a-f0-9]{64}$/),version:z.number().int().positive()}).strict()).min(1).max(100).parse(input);
  const reason=z.string().trim().min(5,'Informe o motivo do cancelamento (mínimo 5 caracteres).').max(2000).parse(note);
  if(new Set(selected.map(j=>j.id)).size!==selected.length)throw new FlowError('Selecione cada tarefa somente uma vez.');
  const jobs:IntegrationJob[]=[],requests:Row<Purchase>[]=[];
  for(const s of selected){
    const j=await row<IntegrationJob>(db,s.id,jobKind);
    if(!j||j.version!==s.version||!canCancelQuotationJob(j))throw new FlowError('Tarefa atualizada, enviada ou com processamento que exige conferência. Recarregue.',409);
    const r=await row<Purchase>(db,j.requestId,'request');
    if(!r||r.archived)throw new FlowError('Pedido ausente ou arquivado. Restaure antes de cancelar.',409);
    jobs.push(j);if(!requests.some(a=>a.id===r.id))requests.push(r);
  }
  // One UPDATE for the entire explicit batch: any version/closing conflict changes zero rows.
  const guards=[...jobs,...requests].map(({id,version})=>({id,version}));
  const payload=jobs.map(j=>({id:j.id,data:{...j,state:'cancelled',updatedAt:now,cancellation:{actor:actor.name,at:now,reason,previousState:j.state}},audit:{id:crypto.randomUUID(),entity:j.requestId,actor:actor.name,action:`Cotação ${j.id} cancelada manualmente: ${reason}`,at:now}}));
  const sql=`UPDATE records SET data=(SELECT json_extract(value,'$.data') FROM json_each(?) WHERE json_extract(value,'$.id')=records.id),version=version+1 WHERE kind=? AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM json_each(?) AS expected LEFT JOIN records AS actual ON actual.id=json_extract(expected.value,'$.id') AND actual.version=json_extract(expected.value,'$.version') WHERE actual.id IS NULL) AND NOT EXISTS(SELECT 1 FROM records AS target JOIN records AS closing ON closing.kind='budget_closing' AND json_extract(closing.data,'$.month')=COALESCE(json_extract(target.data,'$.management.referenceMonth'),json_extract(target.data,'$.form.fields.referenceMonth')) WHERE target.id IN (SELECT value FROM json_each(?)) AND target.kind='request' AND json_extract(closing.data,'$.status')='Concluído')`;
  const auditSql=`INSERT INTO audit(id,entity,actor,action,at) SELECT json_extract(value,'$.audit.id'),json_extract(value,'$.audit.entity'),json_extract(value,'$.audit.actor'),json_extract(value,'$.audit.action'),json_extract(value,'$.audit.at') FROM json_each(?) WHERE changes()=?`;
  const raw=JSON.stringify(payload);
  const result=await db.batch([
    db.prepare(sql).bind(raw,jobKind,raw,JSON.stringify(guards),JSON.stringify(requests.map(r=>r.id))),
    db.prepare(auditSql).bind(raw,jobs.length)
  ]);
  if(result[0].meta.changes!==jobs.length)throw new FlowError('Tarefa ou pedido atualizado, ou mês fechado. Nenhuma tarefa foi cancelada; recarregue.',409);
  return {cancelled:jobs.length};
}
async function projectSentContacts(db:D1Database,settings:Settings,now:string) {
  const suppliers=await rows<Supplier>(db,'supplier');
  for(const j of (await rows<IntegrationJob>(db,jobKind)).filter(j=>j.type==='whatsapp_quote'&&j.state==='done'&&j.sentAt&&j.providerMessageId)) {
    const r=await row<Purchase>(db,j.requestId,'request');
    if(!r||r.archived||r.status!=='quoting'||!r.generalApproval||r.localAttempts?.some(a=>a.integrationJobId===j.id))continue;
    const supplier=suppliers.find(s=>s.id===j.supplierId&&(s.scope||'local')==='local');
    if(!supplier)continue;
    // This projects an existing provider receipt, never a new contact or send.
    // Use the historical name and allow the fact to survive removal from the agenda;
    // the actual supplier record remains removed and unavailable for new selection.
    const historicalSupplier={...supplier,name:j.supplierName||supplier.name,removed:undefined};
    const result=transition(r,{action:'local_contact',supplierId:j.supplierId,reason:`OpenClaw confirmou envio. Mensagem: ${j.providerMessageId}`},{role:'administrativo',name:'OpenClaw'},[historicalSupplier],settings,j.sentAt!);
    result.data.localAttempts![result.data.localAttempts!.length-1].integrationJobId=j.id;
    if(r.localStartedAt&&j.sentAt!<r.localStartedAt){result.data.localStartedAt=j.sentAt;result.data.localDeadline=nextBusinessDay(j.sentAt!,settings.holidays||[])}
    result.data.updatedAt=now;
    await update(db,r,result.data,r.id,'OpenClaw',result.action,now);
  }
}
// Desfecho final da busca de um item (tickets 02, 04 e 05), na primeira saída de Estimativa
// e na nova busca de um item: preço comprovado (automatic), preço a conferir com o motivo
// (to_check) ou pendência de estimativa (análise sem preço ou tentativas esgotadas). Fila,
// execução e nova tentativa não são desfecho (null). A marca vem da regra compartilhada.
function searchOutcomeLine(item:Item,itemIndex:number,j:IntegrationJob,now:string):EstimateLine|null{
  if(!(j.state==='failed'||j.state==='review'&&(j.analysisReason||j.priceEvidence)))return null;
  const evidence=j.state==='review'&&j.priceEvidence&&j.researchedAt?classifyEvidence(item,j.priceEvidence):null;
  if(evidence&&evidence.outcome!=='pending'){
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date(j.researchedAt!));
    return {kind:'product',itemIndex,value:evidence.unitPrice,origin:evidence.outcome==='verified'?'automatic':'to_check',...(evidence.outcome==='to_check'?{reason:evidence.reason}:{}),sourceUrl:j.priceEvidence!.url,sourceName:j.priceEvidence!.title.slice(0,150),researchedOn:day,author:'Sistema',at:now};
  }
  return {kind:'product',itemIndex,value:null,origin:'pending',reason:(j.state==='failed'?j.error:j.analysisReason)||'Preço não comprovado pelas páginas pesquisadas.',author:'Sistema',at:now};
}
// Ticket 07 (E1): frete da loja onde o preço foi encontrado, simulado até o CEP comercial
// da escola com a quantidade pedida, pela regra compartilhada com a ponte. Só existe com
// preço do produto vindo da mesma página; sem frete da loja (ou ponte antiga), null e o
// Site usa o percentual padrão (withFreightLines) ou deixa pendente.
function searchOutcomeFreight(item:Item,itemIndex:number,j:IntegrationJob,product:EstimateLine,now:string):EstimateLine|null{
  if(item.subscription||product.value===null||!j.priceEvidence||product.sourceUrl!==j.priceEvidence.url)return null;
  const freight=classifyFreight(item,j.priceEvidence,schoolFreightDestination);
  if(!freight)return null;
  return {kind:'freight',itemIndex,value:freight.value,origin:freight.outcome==='verified'?'automatic':'to_check',reason:freight.reason,sourceUrl:product.sourceUrl,sourceName:product.sourceName,researchedOn:product.researchedOn,freightSource:'store',author:'Sistema',at:now};
}
async function projectAutomaticEstimates(db:D1Database,now:string) {
  const jobs=await rows<IntegrationJob>(db,jobKind),settings=await schoolSettings(db);
  for(const r of await rows<Purchase>(db,'request')) {
    if(!r.archived&&r.status==='admin_review'&&!r.generalApproval){await projectItemResearch(db,jobs,r,now,settings);continue;}
    // The evidence protocol has no verified billing-period field. Digital sources
    // remain available for review; never multiply an ambiguous monthly price as a term total.
    if(r.archived||r.status!=='estimating'||r.estimate||r.form?.kind==='digital')continue;
    // Cada item precisa de desfecho final da revisão atual: preço comprovado ou pendência
    // de estimativa (análise concluída sem preço, ou tentativas esgotadas). Item ainda na
    // fila, em execução ou em nova tentativa mantém a solicitação em Estimativa.
    const outcomes:{job:IntegrationJob;line:EstimateLine;freight:EstimateLine|null}[]=[];
    for(const [i,item] of r.items.entries()) {
      const id=await estimateSearchId(r,i);
      const j=jobs.find(j=>j.id===id);
      const line=j&&searchOutcomeLine(item,i,j,now);
      if(!line)break;
      outcomes.push({job:j!,line,freight:searchOutcomeFreight(item,i,j!,line,now)});
    }
    if(!outcomes.length||outcomes.length!==r.items.length)continue;
    const selected=outcomes.map(o=>o.job);
    // Ticket 07: frete da loja do preço quando a pesquisa o trouxe; nos demais itens, o Site
    // calcula pelo percentual padrão (a conferir) ou deixa pendente (ticket 06).
    const lines:EstimateLine[]=outcomes.flatMap(o=>o.freight?[o.line,o.freight]:[o.line]);
    const pending=outcomes.filter(o=>o.line.origin==='pending').length,toCheck=outcomes.filter(o=>o.line.origin==='to_check').length;
    const notes=('Estimativa preenchida pelo agente de pesquisa do OpenClaw a partir das páginas. '+`Frete da loja simulado até o CEP ${schoolFreightDestination.cep} quando a página o exibe; `+(typeof settings?.freightPercent==='number'?`sem frete da loja, percentual padrão (${settings.freightPercent}% sobre o valor do produto), a conferir. `:'sem frete da loja, pendente: percentual padrão não configurado. ')+'Não representa proposta comercial. Conferir na análise administrativa. '+outcomes.map(({job:j,line},i)=>`Item ${i+1}${j.researchCriteria?` (similares ${j.researchCriteria.allowSimilar?'autorizados':'não autorizados'} por ${j.researchCriteria.actor})`:''} (${line.origin==='pending'?'pendência de estimativa':(line.origin==='to_check'?'a conferir, ':'')+(j.priceEvidence?.origin==='authenticated_browser'?'navegador autenticado':'página pública')}): ${(line.origin==='automatic'?j.analysisReason:line.reason)||''}`).join(' ')).slice(0,2000);
    const summary=[pending&&(pending===1?'1 pendência':pending+' pendências')+' de estimativa',toCheck&&(toCheck===1?'1 valor':toCheck+' valores')+' a conferir'].filter(Boolean).join(' e ');
    const data:Purchase={...r,updatedAt:now,status:'admin_review',estimate:estimateFromLines(lines,r.items,{notes,recordedAt:now,method:'automatic'},freightPolicy(r,settings))};
    await update(db,r,data,r.id,'Sistema',summary?`Estimativa automática concluída com ${summary}; encaminhada à revisão da Diretoria Administrativa`:'Estimativa automática preenchida com fontes; encaminhada à análise administrativa',now,selected);
  }
}
// Ticket 04 (E1): resultado da nova busca de um item na revisão da estimativa. Só a
// tarefa da revisão de critério gravada na linha (searchRevision) preenche o item; a linha
// que deixou de estar em andamento (preço manual informado) não é substituída.
async function projectItemResearch(db:D1Database,jobs:IntegrationJob[],r:Row<Purchase>,now:string,settings?:Settings){
  const lines=r.estimate?.lines;
  if(!Array.isArray(lines)||!lines.some(l=>l.searchRevision))return;
  const next=[...lines],selected:IntegrationJob[]=[],edits:NonNullable<Purchase['estimateEditHistory']>=[];
  for(const [k,l] of lines.entries()){
    if(l.kind!=='product'||!l.searchRevision||l.itemIndex===undefined)continue;
    const item=r.items[l.itemIndex],id=await estimateSearchId(r,l.itemIndex),j=jobs.find(j=>j.id===id);
    if(!item||!j||j.researchCriteria?.revision!==l.searchRevision||!isCurrentEstimateJob(r,j))continue;
    const line=searchOutcomeLine(item,l.itemIndex,j,now);
    if(!line)continue;
    next[k]=line;selected.push(j);edits.push({itemIndex:l.itemIndex,actor:'Sistema',at:now,previous:l,line,action:'research_result'});
    // Ticket 07: a nova busca traz o frete da loja para o item; frete manual permanece.
    const freight=searchOutcomeFreight(item,l.itemIndex,j,line,now),f=next.findIndex(x=>x.kind==='freight'&&x.itemIndex===l.itemIndex);
    if(freight&&next[f]?.origin!=='manual'){
      edits.push({itemIndex:l.itemIndex,actor:'Sistema',at:now,previous:next[f]||{kind:'freight',itemIndex:l.itemIndex,value:null,origin:'pending',at:now},line:freight,kind:'freight',action:'research_result'});
      if(f<0)next.push(freight);else next[f]=freight;
    }
  }
  if(!selected.length)return;
  const e=r.estimate!;
  const data:Purchase={...r,updatedAt:now,estimate:estimateFromLines(next,r.items,{notes:e.notes,recordedAt:e.recordedAt,method:e.method},freightPolicy(r,settings)),estimateEditHistory:[...(r.estimateEditHistory||[]),...edits]};
  await update(db,r,data,r.id,'Sistema','Revisão da estimativa: resultado da nova busca de '+edits.map(x=>r.items[x.itemIndex].name).join(', ').slice(0,500)+(edits.some(x=>x.line.value===null)?' (pendência de estimativa)':edits.some(x=>x.line.origin==='to_check')?' (a conferir)':''),now,selected as Row<IntegrationJob>[]);
}
export async function tick(db:D1Database,env:IntegrationEnv,now:string) {
  const school=await db.prepare('SELECT data FROM school WHERE id=1').first<{data:string}>();
  if(!school)throw new FlowError('Inicialize a escola pelo painel antes de ativar a ponte.',409);
  await projectSentContacts(db,JSON.parse(school.data),now);
  await advanceDeadlines(db,now);
  await projectAutomaticEstimates(db,now);
  for(const r of await rows<Purchase>(db,'request')) {
    if(!r.archived&&(r.status==='estimating'||(['quoting','national'].includes(r.status)&&r.generalApproval)))await enqueueSearch(db,r,'Sistema',now);
  }
  // Expired search leases are safe to retry. Message leases are not: the remote
  // gateway may have sent the message before the connection was interrupted.
  for(const j of await rows<IntegrationJob>(db,jobKind)) {
    if(j.state!=='running'||!j.leaseUntil||j.leaseUntil>now)continue;
    const state=j.type==='whatsapp_quote'?'uncertain':j.attempts>=maxAttempts?'failed':'queued';
    await update(db,j,{...j,state,leaseToken:undefined,leaseUntil:undefined,nextAttemptAt:now,updatedAt:now,error:'Processamento interrompido; confira o resultado.'},j.requestId,'Sistema','Prazo de processamento da integração expirou',now);
  }
  await db.prepare('INSERT INTO records (id,kind,data,version) VALUES (?,?,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=records.version+1').bind('integration:heartbeat','integration_state',JSON.stringify({lastSeenAt:now})).run();
}
export async function claimJob(db:D1Database,env:IntegrationEnv,now:string,canSend:boolean,researchProtocol?:string,testSendGrant?:unknown) {
  const suppliers=await rows<Supplier>(db,'supplier');
  const contacts=await rows<AgendaEntry>(db,'agenda_contact');
  // An explicit operator setting clears residual provider bindings when leaving
  // a scoped test. Every other configured value, including malformed/expired
  // grants, still fails closed; bridge-supplied grants always require a pair.
  const serverTestGrant=env.WHATSAPP_TEST_SEND_GRANT==='disabled'?undefined:env.WHATSAPP_TEST_SEND_GRANT;
  const testMode=serverTestGrant!==undefined||testSendGrant!==undefined;
  const grant=pairedTestSendGrant(serverTestGrant,testSendGrant,now);
  const jobs=(await rows<IntegrationJob>(db,jobKind)).filter(j=>!j.removed&&(j.state==='queued'||j.state==='blocked'&&!!grant&&j.id===grant.jobId)&&j.nextAttemptAt<=now).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
  for(const j of jobs) {
    // Restricted operational metadata only: never log targets, message bodies,
    // headers, credentials or grant contents. No diagnostic changes eligibility.
    const trace=(reason:string)=>{if(j.type==='whatsapp_quote')console.info('quotation_claim',JSON.stringify({jobId:j.id,jobVersion:j.version,reason,canSend,serverEnabled:env.WHATSAPP_SEND_ENABLED==='true',serverFlagType:typeof env.WHATSAPP_SEND_ENABLED,testMode,serverGrantConfigured:serverTestGrant!==undefined,serverGrantType:typeof env.WHATSAPP_TEST_SEND_GRANT,bridgeGrantSupplied:testSendGrant!==undefined,bridgeGrantType:typeof testSendGrant,nextAttemptReady:j.nextAttemptAt<=now}));};
    trace('candidate');
    const test=!!grant&&matchesTestSendJob(grant,j,'claim',now);
    if(j.type==='whatsapp_quote'&&((testMode&&!test)||j.testSend)){trace('test_restriction');continue;}
    const r=await row<Purchase>(db,j.requestId,'request');
    if(r?.archived){trace('request_archived');continue;} // Preserve queued work and its idempotency; never dispatch archived requests.
    const internalMatch=r&&eligible(r,j,suppliers)&&j.category&&['local_supplier_search','national_search'].includes(j.type)&&matchingSuppliers(suppliers,j.category,j.type==='local_supplier_search'?'local':'national').length>0;
    if(!r||!eligible(r,j,suppliers,contacts)||internalMatch) {
      trace('ineligible');
      if(test)continue; // A failed scoped preflight never cancels the preserved test draft.
      await update(db,j,{...j,state:'cancelled',updatedAt:now},j.requestId,'Sistema',internalMatch?'Busca externa cancelada: fornecedor compatível disponível no cadastro':'Tarefa cancelada após mudança da etapa ou categoria',now);continue;
    }
    if(j.researchCriteria&&researchProtocol!=='criteria-v1')continue;
    if(j.type==='whatsapp_quote') {
      if(!test&&(!canSend||env.WHATSAPP_SEND_ENABLED!=='true')){trace('send_disabled');continue;}
      // A changed phone number requires a fresh human decision, never silent rerouting.
      const recipient=j.manualSelection?[...suppliers,...contacts].find(c=>c.id===j.manualSelection!.recipientId):suppliers.find(s=>s.id===j.supplierId);
      if(!recipient||normalizeContactPhone(recipient.phone)!==j.target){trace('recipient_changed');continue;}
    }
    const next={...j,state:'running' as const,attempts:j.attempts+1,leaseToken:crypto.randomUUID(),leaseUntil:addMs(now,j.type==='estimate_search'?600000:120000),updatedAt:now};
    if(test){
      const recipient=j.manualSelection?[...suppliers,...contacts].find(c=>c.id===j.manualSelection!.recipientId)!:suppliers.find(s=>s.id===j.supplierId)!;
      const contact=recipient.contact||recipient.name,text=quotationMessageTemplate(r);
      next.messageHistory=[...(j.messageHistory||[]),{message:j.message,quotationTemplate:j.quotationTemplate,at:now,reason:'Teste único autorizado: modelo atual; texto anterior preservado'}];
      next.message=quotationMessage(r,{...recipient,contact} as Supplier);next.quotationTemplate={version:'contact-v1',text,contact};
      next.testSend={version:grant!.version,issuedAt:grant!.issuedAt,expiresAt:grant!.expiresAt};
    }
    const guards=[r,...(j.type==='whatsapp_quote'?[j.manualSelection?[...suppliers,...contacts].find(c=>c.id===j.manualSelection!.recipientId)!:suppliers.find(s=>s.id===j.supplierId)!]:[])];
    // Ticket 07: a pesquisa de estimativa leva o CEP comercial da escola e a quantidade pedida
    // para a simulação do frete. Não é gravado na tarefa; ponte antiga ignora o campo.
    const freightSimulation=j.type==='estimate_search'&&j.item&&!j.item.subscription&&r.form?.kind!=='digital'?{...schoolFreightDestination,quantity:j.item.quantity}:undefined;
    if(await update(db,j,next,j.requestId,'Ponte OpenClaw',test?'Teste único autorizado por tarefa, versão, destino e prazo; modelo revisado com histórico':'Processamento da integração iniciado',now,guards,j.manualSelection||test?r.id:j.id)){trace('claimed');return {...next,version:j.version+1,...(freightSimulation?{freightSimulation}:{})};}
    trace('cas_not_matched');
  }
  return null;
}
const sourceSchema=z.object({title:z.string().trim().min(1).max(300),url:z.string().url().max(2000).refine(v=>{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}),description:z.string().max(2000)});
// Ticket 07: frete da loja na evidência do item. Fora do formato, é descartado sem recusar o
// resultado (o Site cai para o percentual); a regra classifyFreight decide o valor.
const freightSchema=z.object({status:z.enum(['quoted','free','not_shown']),amount:z.number().nonnegative().max(1000000).optional(),quote:z.string().max(2000).optional(),cep:z.string().max(20).optional(),quantity:z.number().int().positive().max(100000).optional(),approximate:z.boolean().optional(),reason:z.string().max(2000).optional()}).optional().catch(undefined);
const resultSchema=z.object({jobId:z.string().max(100),leaseToken:z.string().uuid(),outcome:z.enum(['success','error','uncertain']),sources:z.array(sourceSchema).max(5).optional(),browserResearch:z.object({state:z.enum(['ready','login_required','unverified','unavailable']),detail:z.string().max(600),profile:z.literal('compras'),checkedAt:z.string().datetime()}).optional(),priceEvidence:z.object({url:z.string().url().max(2000),title:z.string().max(300),text:z.string().max(12000),origin:z.enum(['public','authenticated_browser']).optional(),analysis:z.object({status:z.enum(['verified','to_check']),sourceUrl:z.string().url().max(2000),productName:z.string().max(300).optional(),productQuote:z.string().max(2000).optional(),priceAmount:z.number().positive().max(10000000),currency:z.literal('BRL'),priceType:z.literal('total'),priceQuote:z.string().max(2000).optional(),packageQuantity:z.number().optional(),unit:z.string().max(30).optional(),unitQuote:z.string().max(2000).optional(),itemMatches:z.boolean().optional(),unitMatches:z.boolean().optional(),reason:z.string().max(2000).optional(),freight:freightSchema})}).optional(),analysisReason:z.string().max(800).optional(),providerMessageId:z.string().min(1).max(300).optional(),sentAt:z.string().datetime().optional()});
export async function completeJob(db:D1Database,input:unknown,now:string) {
  const b=resultSchema.parse(input),j=await row<IntegrationJob>(db,b.jobId,jobKind);
  if(!j||j.leaseToken!==b.leaseToken)throw new FlowError('Processamento expirado ou não reconhecido.',409);
  if(j.state!=='running')return {duplicate:true};
  if(!j.leaseUntil||j.leaseUntil<now)throw new FlowError('Processamento expirou. Confira o histórico.',409);
  let next:IntegrationJob={...j,updatedAt:now};
  if(j.type==='whatsapp_quote') {
    if(b.outcome==='success'&&b.providerMessageId&&b.sentAt&&b.sentAt<=now&&b.sentAt>=j.updatedAt)next={...next,state:'done',providerMessageId:b.providerMessageId,sentAt:b.sentAt};
    else next={...next,state:'uncertain',error:'Envio sem confirmação confiável. Conferir no OpenClaw antes de novo contato.'};
  } else if(b.outcome==='success'&&b.sources) {
    next={...next,state:'review',sources:b.sources,researchedAt:now,error:undefined,priceEvidence:undefined,analysisReason:b.analysisReason,browserResearch:b.browserResearch};
    if(j.type==='estimate_search'&&j.item&&b.priceEvidence&&b.sources.some(s=>s.url===b.priceEvidence!.url)&&classifyEvidence(j.item,b.priceEvidence).outcome!=='pending')next.priceEvidence=b.priceEvidence;
  } else {
    next={...next,state:j.attempts>=maxAttempts?'failed':'queued',nextAttemptAt:addMs(now,60000*2**j.attempts),error:'Pesquisa indisponível ou resposta incompatível. Confira a configuração do OpenClaw.'};
  }
  if(!await update(db,j,next,j.requestId,'OpenClaw',next.state==='review'?'Pesquisa recebida; fontes e valores exigem conferência':next.state==='done'?'Envio confirmado pelo OpenClaw':next.error!,now))throw new FlowError('Tarefa atualizada por outro processo.',409);
  if(j.type==='estimate_search')await projectAutomaticEstimates(db,now);
  return {duplicate:false};
}
export {receiveSelectedMessage as receiveMessage} from './inbox-selected';
export async function reviewMessage(db:D1Database,id:string,version:number,note:string,actor:string,now:string) {
  const m=await row<InboxMessage>(db,id,inboxKind);
  if(!m||m.version!==version)throw new FlowError('Mensagem atualizada. Recarregue.',409);
  const reason=z.string().trim().min(5).max(2000).parse(note);
  if(!await update(db,m,{...m,state:'reviewed',note:reason,reviewedAt:now,reviewedBy:actor},m.requestId||m.id,actor,'Mensagem conferida: '+reason,now))throw new FlowError('Mensagem atualizada. Recarregue.',409);
}
