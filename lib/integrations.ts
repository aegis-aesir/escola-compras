import {extractReference} from '../integrations/openclaw/price-evidence.mjs';
import { z } from 'zod';
import { type Purchase, type Supplier, type Settings, quotationMessage, categorySchema, supplierSchema } from '../app/model';
import { categoryKey, matchingSuppliers, requestCategories } from '../app/supplier-discovery';
import { FlowError, localExpired, nextBusinessDay, transition } from '../app/workflow';
import type { IntegrationJob, IntegrationSnapshot, InboxMessage } from '../app/integration-model';

type Row<T> = T & {id:string;version:number};
export type IntegrationEnv = {DB?:D1Database;INTEGRATION_SECRET?:string;WHATSAPP_SEND_ENABLED?:string};
export const accountId = 'operacional';
export const schoolPhone = '+559292017107';
const jobKind = 'integration_job';
const inboxKind = 'integration_inbox';
const maxAttempts = 3;
const addMs = (at:string,ms:number)=>new Date(Date.parse(at)+ms).toISOString();
const phone = (value:string)=>'+'+value.replace(/\D/g,'');
export async function rows<T>(db:D1Database,kind:string):Promise<Row<T>[]> {
  const result=await db.prepare('SELECT id,data,version FROM records WHERE kind=?').bind(kind).all<{id:string;data:string;version:number}>();
  return result.results.map(r=>({...JSON.parse(r.data),id:r.id,version:r.version}));
}
async function row<T>(db:D1Database,id:string,kind:string):Promise<Row<T>|null> {
  const r=await db.prepare('SELECT id,data,version FROM records WHERE id=? AND kind=?').bind(id,kind).first<{id:string;data:string;version:number}>();
  return r?{...JSON.parse(r.data),id:r.id,version:r.version}:null;
}
function audit(db:D1Database,entity:string,actor:string,action:string,at:string) {
  return db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),entity,actor,action,at);
}
async function insert(db:D1Database,id:string,kind:string,data:object,entity:string,actor:string,action:string,at:string) {
  const result=await db.batch([db.prepare('INSERT OR IGNORE INTO records (id,kind,data,version) VALUES (?,?,?,1)').bind(id,kind,JSON.stringify(data)),audit(db,entity,actor,action,at)]);
  return result[0].meta.changes===1;
}
async function update(db:D1Database,old:{id:string;version:number},data:object,entity:string,actor:string,action:string,at:string,guards:{id:string;version:number}[]=[]) {
  const sql='UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?'+guards.map(()=> ' AND EXISTS (SELECT 1 FROM records AS guard WHERE guard.id=? AND guard.version=?)').join('');
  const result=await db.batch([db.prepare(sql).bind(JSON.stringify(data),old.id,old.version,...guards.flatMap(g=>[g.id,g.version])),audit(db,entity,actor,action,at)]);
  return result[0].meta.changes===1;
}
export async function digest(value:string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function eligible(r:Purchase,j:Pick<IntegrationJob,'type'|'supplierId'|'category'>,suppliers:Supplier[]) {
  if(j.type==='estimate_search')return ['estimating','pending'].includes(r.status);
  if(!r.generalApproval)return false;
  if(j.type==='national_search'||j.type==='local_supplier_search')return r.status===(j.type==='national_search'?'national':'quoting')&&!!j.category&&requestCategories(r).some(c=>categoryKey(c.category)===categoryKey(j.category!));
  const s=suppliers.find(s=>s.id===j.supplierId);
  return !!s&&(r.status==='national'||(r.status==='quoting'&&(s.scope||'local')==='local'));
}
export async function enqueueSearch(db:D1Database,r:Purchase,actor:string,now:string) {
  if(['quoting','national'].includes(r.status))return enqueueSupplierSearch(db,r,actor,now);
  const type=r.status==='national'?'national_search':'estimate_search';
  if(!eligible(r,{type},[]))throw new FlowError('Pesquisa indisponível nesta etapa.');
  let created=0;
  for(const [itemIndex,item] of r.items.entries()) {
    const query=`${item.name} ${item.spec} ${item.unit} ${type==='estimate_search'?'preço comprar Brasil':'fornecedor entrega Manaus AM Brasil'}`.slice(0,380);
    const id='search:'+await digest(JSON.stringify(['prices-agent-v1',r.id,type,itemIndex,item]));
    const data:Omit<IntegrationJob,'version'>={id,requestId:r.id,type,itemIndex,item,query,state:'queued',createdAt:now,updatedAt:now,attempts:0,nextAttemptAt:now};
    const existing=await row<IntegrationJob>(db,id,jobKind);
    if(existing?.state==='review'&&existing.item&&!existing.analysisReason&&!existing.priceEvidence) {
      if(await update(db,existing,{...data,createdAt:existing.createdAt},r.id,actor,'Pesquisa anterior sem análise operacional reenfileirada',now))created++;
    }else if(await insert(db,id,jobKind,data,r.id,actor,`Pesquisa enfileirada: ${item.name}`,now))created++;
  }
  return created;
}
export async function enqueueSupplierSearch(db:D1Database,r:Purchase,actor:string,now:string) {
  const type=r.status==='national'?'national_search':'local_supplier_search';
  if(!r.generalApproval||r.status!==(type==='national_search'?'national':'quoting'))throw new FlowError('A busca de fornecedores exige aprovação e a etapa correspondente.');
  const scope=type==='local_supplier_search'?'local':'national';
  const suppliers=await rows<Supplier>(db,'supplier');
  let created=0;
  for(const {category,itemIndex} of requestCategories(r)) {
    if(matchingSuppliers(suppliers,category,scope).length)continue;
    const query=`${category} fornecedores ${scope==='local'?'Manaus AM loja endereço telefone':'Brasil entrega Manaus AM contato'}`;
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
  const hash=await digest(phone(data.phone));
  const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  const created=await insert(db,id,'supplier',{...data,discovery:{sourceUrl:source.url,researchedAt:j.researchedAt,reviewedAt:now,reviewedBy:actor,jobId}},r.id,actor,`Fornecedor cadastrado após conferência da pesquisa: ${data.name}`,now);
  if(!created) {
    const winner=await row<Supplier>(db,id,'supplier');
    if(!winner||!matchingSuppliers([winner],data.category,data.scope).length)throw new FlowError('Este telefone foi cadastrado simultaneamente em outra categoria ou abrangência. Recarregue e confira.',409);
  }
  return id;
}
export async function enqueueQuotation(db:D1Database,r:Purchase,s:Supplier,actor:string,now:string,env:IntegrationEnv) {
  if(!eligible(r,{type:'whatsapp_quote',supplierId:s.id},[s]))throw new FlowError('A cotação exige aprovação da necessidade e fornecedor permitido nesta etapa.');
  const target=phone(s.phone);
  if(!/^\+[1-9]\d{9,14}$/.test(target))throw new FlowError('Confira o telefone internacional do fornecedor antes de preparar a cotação.');
  const existing=(await rows<IntegrationJob>(db,jobKind)).find(j=>j.type==='whatsapp_quote'&&j.requestId===r.id&&j.target===target);
  if(existing)return existing.id;
  const id='whatsapp:'+await digest(JSON.stringify([r.id,target,r.generalApproval?.at]));
  const job:Omit<IntegrationJob,'version'>={id,requestId:r.id,type:'whatsapp_quote',supplierId:s.id,supplierName:s.name,target:phone(s.phone),accountId,schoolPhone,message:quotationMessage(r,s),state:env.WHATSAPP_SEND_ENABLED==='true'?'queued':'blocked',createdAt:now,updatedAt:now,attempts:0,nextAttemptAt:now};
  await insert(db,id,jobKind,job,r.id,actor,'Cotação preparada para OpenClaw; envio depende da ativação',now);
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
export async function retryJob(db:D1Database,id:string,version:number,actor:string,now:string,env:IntegrationEnv) {
  const j=await row<IntegrationJob>(db,id,jobKind);
  if(!j||j.version!==version)throw new FlowError('Tarefa atualizada. Recarregue o painel.',409);
  // Uncertain sends can never be retried automatically or through this action.
  if(!['failed','blocked'].includes(j.state)&&!(j.type==='estimate_search'&&j.state==='review'))throw new FlowError('Esta tarefa não permite nova tentativa.');
  if(j.type==='whatsapp_quote'&&(j.state!=='blocked'||env.WHATSAPP_SEND_ENABLED!=='true'))throw new FlowError('Envio desativado ou exige conferência manual.');
  const r=await row<Purchase>(db,j.requestId,'request');
  if(!r||!eligible(r,j,await rows<Supplier>(db,'supplier')))throw new FlowError('A etapa do pedido não permite esta tarefa.');
  if(!await update(db,j,{...j,state:'queued',attempts:0,error:undefined,priceEvidence:undefined,sources:undefined,researchedAt:undefined,updatedAt:now,nextAttemptAt:now},j.requestId,actor,'Nova tentativa de integração solicitada',now))throw new FlowError('Tarefa atualizada. Recarregue.',409);
}
async function projectSentContacts(db:D1Database,settings:Settings,now:string) {
  const suppliers=await rows<Supplier>(db,'supplier');
  for(const j of (await rows<IntegrationJob>(db,jobKind)).filter(j=>j.type==='whatsapp_quote'&&j.state==='done'&&j.sentAt&&j.providerMessageId)) {
    const r=await row<Purchase>(db,j.requestId,'request');
    if(!r||r.status!=='quoting'||!r.generalApproval||r.localAttempts?.some(a=>a.integrationJobId===j.id))continue;
    if(!suppliers.some(s=>s.id===j.supplierId&&(s.scope||'local')==='local'))continue;
    const result=transition(r,{action:'local_contact',supplierId:j.supplierId,reason:`OpenClaw confirmou envio. Mensagem: ${j.providerMessageId}`},{role:'administrativo',name:'OpenClaw'},suppliers,settings,j.sentAt!);
    result.data.localAttempts![result.data.localAttempts!.length-1].integrationJobId=j.id;
    if(r.localStartedAt&&j.sentAt!<r.localStartedAt){result.data.localStartedAt=j.sentAt;result.data.localDeadline=nextBusinessDay(j.sentAt!,settings.holidays||[])}
    result.data.updatedAt=now;
    await update(db,r,result.data,r.id,'OpenClaw',result.action,now);
  }
}
async function projectAutomaticEstimates(db:D1Database,now:string) {
  const jobs=await rows<IntegrationJob>(db,jobKind);
  for(const r of await rows<Purchase>(db,'request')) {
    if(!['estimating','pending'].includes(r.status)||r.estimate)continue;
    const selected:IntegrationJob[]=[];
    for(const [i,item] of r.items.entries()) {
      const id='search:'+await digest(JSON.stringify(['prices-agent-v1',r.id,'estimate_search',i,item]));
      const j=jobs.find(j=>j.id===id&&j.state==='review'&&j.priceEvidence&&j.researchedAt);
      if(!j||!extractReference(item,j.priceEvidence!))break;
      selected.push(j);
    }
    if(!selected.length||selected.length!==r.items.length)continue;
    const references=selected.map((j,i)=>({unitPrice:extractReference(r.items[i],j.priceEvidence!)!.unitPrice,sourceUrl:j.priceEvidence!.url,sourceName:j.priceEvidence!.title.slice(0,150),researchedOn:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date(j.researchedAt!))}));
    const result=transition(r,{action:'estimate',data:{references,freight:0,notes:('Estimativa preenchida pelo agente operacional do OpenClaw a partir das páginas. Frete não apurado e não incluído no total. Não representa proposta comercial. Conferir na análise administrativa. '+selected.map((j,i)=>`Item ${i+1} (${j.priceEvidence?.origin==='authenticated_browser'?'navegador autenticado':'página pública'}): ${j.analysisReason||''}`).join(' ')).slice(0,2000)}},{role:'administrativo',name:'Sistema'},[],{} as Settings,now);
    result.data.estimate!.method='automatic';
    result.data.estimate!.freightKnown=false;
    await update(db,r,result.data,r.id,'Sistema','Estimativa automática preenchida com fontes; encaminhada à análise administrativa',now,selected);
  }
}
export async function tick(db:D1Database,env:IntegrationEnv,now:string) {
  const school=await db.prepare('SELECT data FROM school WHERE id=1').first<{data:string}>();
  if(!school)throw new FlowError('Inicialize a escola pelo painel antes de ativar a ponte.',409);
  await projectSentContacts(db,JSON.parse(school.data),now);
  await advanceDeadlines(db,now);
  await projectAutomaticEstimates(db,now);
  for(const r of await rows<Purchase>(db,'request')) {
    if(['estimating','pending'].includes(r.status)||(['quoting','national'].includes(r.status)&&r.generalApproval))await enqueueSearch(db,r,'Sistema',now);
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
export async function claimJob(db:D1Database,env:IntegrationEnv,now:string,canSend:boolean) {
  const suppliers=await rows<Supplier>(db,'supplier');
  const jobs=(await rows<IntegrationJob>(db,jobKind)).filter(j=>j.state==='queued'&&j.nextAttemptAt<=now).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
  for(const j of jobs) {
    const r=await row<Purchase>(db,j.requestId,'request');
    const internalMatch=j.category&&['local_supplier_search','national_search'].includes(j.type)&&matchingSuppliers(suppliers,j.category,j.type==='local_supplier_search'?'local':'national').length>0;
    if(!r||!eligible(r,j,suppliers)||internalMatch) {
      await update(db,j,{...j,state:'cancelled',updatedAt:now},j.requestId,'Sistema',internalMatch?'Busca externa cancelada: fornecedor compatível disponível no cadastro':'Tarefa cancelada após mudança da etapa ou categoria',now);continue;
    }
    if(j.type==='whatsapp_quote') {
      if(!canSend||env.WHATSAPP_SEND_ENABLED!=='true')continue;
      // A changed phone number requires a fresh human decision, never silent rerouting.
      if(phone(suppliers.find(s=>s.id===j.supplierId)!.phone)!==j.target)continue;
    }
    const next={...j,state:'running' as const,attempts:j.attempts+1,leaseToken:crypto.randomUUID(),leaseUntil:addMs(now,j.type==='estimate_search'?600000:120000),updatedAt:now};
    const guards=[r,...(j.type==='whatsapp_quote'?[suppliers.find(s=>s.id===j.supplierId)!]:[])];
    if(await update(db,j,next,j.requestId,'Ponte OpenClaw','Processamento da integração iniciado',now,guards))return {...next,version:j.version+1};
  }
  return null;
}
const sourceSchema=z.object({title:z.string().trim().min(1).max(300),url:z.string().url().max(2000).refine(v=>{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}),description:z.string().max(2000)});
const resultSchema=z.object({jobId:z.string().max(100),leaseToken:z.string().uuid(),outcome:z.enum(['success','error','uncertain']),sources:z.array(sourceSchema).max(5).optional(),browserResearch:z.object({state:z.enum(['ready','login_required','unverified','unavailable']),detail:z.string().max(600),profile:z.literal('compras'),checkedAt:z.string().datetime()}).optional(),priceEvidence:z.object({url:z.string().url().max(2000),title:z.string().max(300),text:z.string().max(12000),origin:z.enum(['public','authenticated_browser']).optional(),analysis:z.object({status:z.literal('verified'),sourceUrl:z.string().url().max(2000),productName:z.string().min(2).max(300),productQuote:z.string().min(3).max(2000),priceAmount:z.number().positive().max(10000000),currency:z.literal('BRL'),priceType:z.literal('total'),priceQuote:z.string().min(3).max(2000),packageQuantity:z.number().int().min(1).max(100000),unit:z.string().max(30),unitQuote:z.string().min(3).max(2000),itemMatches:z.literal(true),unitMatches:z.literal(true),reason:z.string().min(10).max(2000)})}).optional(),analysisReason:z.string().max(800).optional(),providerMessageId:z.string().min(1).max(300).optional(),sentAt:z.string().datetime().optional()});
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
    if(j.type==='estimate_search'&&j.item&&b.priceEvidence&&b.sources.some(s=>s.url===b.priceEvidence!.url)&&extractReference(j.item,b.priceEvidence))next.priceEvidence=b.priceEvidence;
  } else {
    next={...next,state:j.attempts>=maxAttempts?'failed':'queued',nextAttemptAt:addMs(now,60000*2**j.attempts),error:'Pesquisa indisponível ou resposta incompatível. Confira a configuração do OpenClaw.'};
  }
  if(!await update(db,j,next,j.requestId,'OpenClaw',next.state==='review'?'Pesquisa recebida; fontes e valores exigem conferência':next.state==='done'?'Envio confirmado pelo OpenClaw':next.error!,now))throw new FlowError('Tarefa atualizada por outro processo.',409);
  if(j.type==='estimate_search')await projectAutomaticEstimates(db,now);
  return {duplicate:false};
}
const inboxSchema=z.object({messageId:z.string().min(1).max(300),accountId:z.literal(accountId),from:z.string().regex(/^\+[1-9]\d{9,14}$/),to:z.literal(schoolPhone),text:z.string().min(1).max(16000),receivedAt:z.string().datetime()});
export async function receiveMessage(db:D1Database,input:unknown,now:string) {
  const b=inboxSchema.parse(input);
  if(b.receivedAt>addMs(now,300000))throw new FlowError('Data da mensagem inválida.');
  const id='inbox:'+await digest(JSON.stringify([b.accountId,b.messageId]));
  const existing=await row<InboxMessage>(db,id,inboxKind);
  if(existing) {
    if(existing.from!==b.from||existing.to!==b.to||existing.text!==b.text)throw new FlowError('Identificador de mensagem com conteúdo diferente.',409);
    return {id,duplicate:true};
  }
  const suppliers=(await rows<Supplier>(db,'supplier')).filter(s=>phone(s.phone)===b.from);
  const candidates=(await rows<Purchase>(db,'request')).filter(r=>r.generalApproval&&['quoting','national','execution','ordered'].includes(r.status)&&new RegExp(`\\b${r.code}\\b`,'i').test(b.text));
  const message:Omit<InboxMessage,'version'>={...b,id,state:'review',recordedAt:now,supplierId:suppliers.length===1?suppliers[0].id:undefined,requestId:candidates.length===1?candidates[0].id:undefined};
  const created=await insert(db,id,inboxKind,message,message.requestId||id,'OpenClaw','Mensagem recebida para conferência; nenhuma proposta criada automaticamente',now);
  return {id,duplicate:!created};
}
export async function reviewMessage(db:D1Database,id:string,version:number,note:string,actor:string,now:string) {
  const m=await row<InboxMessage>(db,id,inboxKind);
  if(!m||m.version!==version)throw new FlowError('Mensagem atualizada. Recarregue.',409);
  const reason=z.string().trim().min(5).max(2000).parse(note);
  if(!await update(db,m,{...m,state:'reviewed',note:reason,reviewedAt:now,reviewedBy:actor},m.requestId||m.id,actor,'Mensagem conferida: '+reason,now))throw new FlowError('Mensagem atualizada. Recarregue.',409);
}
