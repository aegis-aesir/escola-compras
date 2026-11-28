import {normalizeContactPhone} from '../../../integrations/openclaw/contact-phone.mjs';
import {consolidateDeferredDrafts} from '../../../lib/deferred-requests';
import {saveAgendaContact} from '../../../lib/contact-agenda';
import {enqueueSelectedContacts} from '../../../lib/quotation-contacts';
import {removeQuotationJob,restoreQuotationJob} from '../../../lib/quotation-removal';
import {receiveSelectedMessage,confirmInboxProposal} from '../../../lib/inbox-selected';
import {reapplyDeferredRequest} from '../../deferred-request';
import { env } from 'cloudflare:workers';
import { currentLocalUser } from '../../local-session';
import {parseBudgetForm,budgetMonth} from '../../budget';
import {canSubmitDeferredDraft} from '../../deferred-draft';
import {budgetRecordsAction,readBudgetRecords,closedBudgetMonth} from '../../../lib/budget-records';
import { listLocalUsers } from '../../../lib/local-auth';
import { visibleRequests, canCreateRequest, canFinanceReadRequest, canReadBudgetRecords } from '../../access';
import { requestSchema, supplierSchema, quoteSchema, quoteTotal, sectors, estimateSettingsSchema, type Purchase, type Supplier, type Settings, type EstimateSettingsValue } from '../../model';
import {icmsSettingsSchema,currentIcmsTable,icmsTableLabel,type IcmsTable} from '../../estimate-icms';
import type {BudgetClosing,BudgetRecord} from '../../budget-month';
import { z } from 'zod';
import { transition, FlowError, localExpired } from '../../workflow';
import { advanceDeadlines, enqueueSearch, enqueueQuotation, enqueueQuotations, integrationSnapshot, retryJob, reviewMessage, setSupplierCategories, registerDiscoveredSupplier, startEstimateSearch, configureEstimateResearch, cancelQuotationJobs, digest } from '../../../lib/integrations';
export const dynamic = 'force-dynamic';
const initial:Settings = {name:'Colégio Estrelas',legalName:'Centro Educacional Estrelas do Amanhã LTDA',minQuotes:3,departments:sectors};
// O histórico da configuração da estimativa (ticket 06) fica só com o Master.
function publicSettings(settings:Settings,me:{role:string;department:string}):Settings{
  const {estimateSettingsHistory,...rest}=settings;
  if(me.role==='admin')return settings;
  return me.role==='solicitante'?{...rest,departments:[me.department]}:rest;
}
class AppError extends Error {constructor(message:string,public status=400){super(message)}}
function financeClosing(c:BudgetClosing,requestIds:Set<string>):BudgetClosing{
  const {snapshot,...data}=c;
  return {...data,followups:(c.followups||[]).filter(f=>requestIds.has(f.requestId)),history:c.history?.map(h=>financeClosing(h,requestIds))};
}
function financeRecords(records:BudgetRecord[],requests:Purchase[]):BudgetRecord[]{
  const requestIds=new Set(requests.map(r=>r.id));
  const visible:BudgetRecord[]=[];
  for(const record of records){
    if(record.kind==='budget_invoice'){if(requestIds.has(record.data.requestId))visible.push(record);continue;}
    visible.push({...record,data:financeClosing(record.data,requestIds)});
  }
  return visible;
}
async function context(){
  const user=await currentLocalUser(); if(!user)throw new AppError('Entre com seu usuário e senha.',401);
  const db=env.DB!;
  const school=await db.prepare('SELECT * FROM school WHERE id=1').first<{owner:string;data:string}>();
  if(!school)throw new AppError('A escola ainda não foi inicializada.',503);
  await consolidateDeferredDrafts(db,new Date().toISOString());
  const rows=await db.prepare('SELECT * FROM records').all<{id:string;kind:string;data:string;version:number}>();
  const all=rows.results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,version:r.version}));
  const me={id:user.id,name:user.name,username:user.username,email:'',role:user.role,department:user.department};
  return {db,all,me,settings:JSON.parse(school!.data) as Settings};
}
function fail(e:unknown){if(e instanceof z.ZodError)return Response.json({error:e.issues[0]?.message||'Confira os campos.'},{status:400}); if(e instanceof Error&&'status'in e&&e.status===400)return Response.json({error:e.message},{status:400}); if(e instanceof AppError || e instanceof FlowError)return Response.json({error:e.message},{status:e.status}); console.error('Data operation failed',e instanceof Error?e.message:'unknown');return Response.json({error:'Não foi possível salvar. Tente novamente.'},{status:500});}
export async function GET(req:Request){try{
  let {db,all,me,settings}=await context();
  const historyFor=new URL(req.url).searchParams.get('historyFor');
  if(historyFor){
    const historyRequest=all.find(r=>r.kind==='request'&&r.id===historyFor) as Purchase|undefined;
    if(!historyRequest)throw new AppError('Solicitação não encontrada.',404);
    const full=['admin','administrativo'].includes(me.role)||(me.role==='financeiro'&&canFinanceReadRequest(historyRequest));
    if(!full&&!visibleRequests([historyRequest],me).some(r=>r.id===historyFor))throw new AppError('Seu perfil não permite consultar este histórico.',403);
    const history=full
      ?await db.prepare("SELECT * FROM audit WHERE entity=? OR entity IN (SELECT id FROM records WHERE kind IN ('budget_invoice','request_revision') AND json_extract(data,'$.requestId')=?) ORDER BY at DESC,id DESC").bind(historyFor,historyFor).all()
      :await db.prepare("SELECT * FROM audit WHERE (entity=? OR entity IN (SELECT id FROM records WHERE kind='request_revision' AND json_extract(data,'$.requestId')=?)) AND action NOT LIKE '% · internal' ORDER BY at DESC,id DESC").bind(historyFor,historyFor).all();
    return Response.json({activity:history.results},{headers:{'Cache-Control':'no-store'}});
  }
  if(['admin','administrativo'].includes(me.role)&&await advanceDeadlines(db,new Date().toISOString()))({all}=await context());
  const requests=visibleRequests(all.filter(r=>r.kind==='request'),me);
  const allBudgetRecords=canReadBudgetRecords(me.role)?await readBudgetRecords(db):undefined;
  const budgetRecords=me.role==='financeiro'&&allBudgetRecords?financeRecords(allBudgetRecords,requests):allBudgetRecords;
  const activity=await db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 200').all();
  const management=['admin','administrativo'].includes(me.role);
  return Response.json({requests,budgetRecords,suppliers:management?all.filter(r=>r.kind==='supplier'):[],members:me.role==='admin'?await listLocalUsers(db):[],settings:publicSettings(settings,me),me,integrations:management?await integrationSnapshot(db,env):undefined,activity:management?activity.results:['financeiro','geral'].includes(me.role)?activity.results.filter(a=>requests.some(r=>r.id===a.entity)||budgetRecords?.some(r=>r.id===a.entity)):[]},{headers:{'Cache-Control':'no-store'}});
}catch(e){return fail(e)}}
export async function POST(req:Request){try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new AppError('Origem inválida.',403);
  if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError('Formato inválido.');
  const raw=await req.text();if(raw.length>100000)throw new AppError('Solicitação muito grande.');
  let b:any;try{b=JSON.parse(raw)}catch{throw new AppError('Conteúdo inválido.')}
  const {db,all,me,settings}=await context();const now=new Date().toISOString();
  if(me.role==='financeiro')throw new AppError('O perfil Financeiro permite somente consulta e acompanhamento.',403);
  const budgetRecords=await readBudgetRecords(db);
  if(['budget_invoice','budget_closing','budget_reopen'].includes(b.action))return Response.json({ok:true,...await budgetRecordsAction(db,b,me,all.filter(r=>r.kind==='request'),settings,now)});
  const target=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;
  const archiveAction=['archive_request','restore_request'].includes(b.action);
  const masterReanalysis=b.action==='master_reanalysis'&&me.role==='admin';
  if(target?.archived&&!archiveAction&&!masterReanalysis)throw new AppError('Solicitação arquivada. O Master deve restaurá-la antes de alterar.',409);
  if(target&&!archiveAction&&closedBudgetMonth(budgetRecords,budgetMonth(target)))throw new AppError('Reabra o fechamento mensal com justificativa antes de alterar o pedido.');
  const permit=(roles:string[])=>{if(!roles.includes(me.role))throw new AppError('Seu perfil não permite esta ação.',403)};
  if(b.action==='confirm_inbox_proposal')return Response.json({ok:true,...await confirmInboxProposal(db,b,me,settings,now)});
  if(b.action==='import_selected_message'){
    permit(['admin','administrativo']);
    const input=z.object({supplierId:z.string(),text:z.string().trim().min(1).max(16000),receivedOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),reason:z.string().trim().min(5).max(2000)}).parse(b);
    const supplier=all.find(s=>s.id===input.supplierId&&s.kind==='supplier'&&!s.removed);if(!supplier)throw new AppError('Selecione o fornecedor cadastrado.');
    const from=normalizeContactPhone(supplier.phone);if(!from)throw new AppError('Telefone do fornecedor inválido.');
    const messageId='manual:'+await digest(JSON.stringify([from,input.text,input.receivedOn]));
    return Response.json({ok:true,...await receiveSelectedMessage(db,{protocol:'selected-message-v1',messageId,accountId:'operacional',from,to:'+559292017107',text:input.text,receivedAt:input.receivedOn+'T12:00:00.000Z',selection:{accountId:'operacional',messageId,actor:me.name,at:now,reason:input.reason,attachmentIds:[]}},now,env)});
  }
  if(b.action==='cancel_quotation_jobs')return Response.json({ok:true,...await cancelQuotationJobs(db,b.jobs,b.reason,me,now)});
  if(b.action==='remove_quotation')return Response.json({ok:true,...await removeQuotationJob(db,b,me,now)});
  if(b.action==='restore_quotation')return Response.json({ok:true,...await restoreQuotationJob(db,b,me,now)});
  if(['research','research_item','prepare_openclaw','retry_integration','review_message','supplier_categories','register_discovered_supplier'].includes(b.action)){
    permit(['admin','administrativo']);
    if(b.action==='register_discovered_supplier')return Response.json({ok:true,id:await registerDiscoveredSupplier(db,b.jobId,b.sourceIndex,b.data,me.name,now)});
    if(b.action==='retry_integration')await retryJob(db,b.id,b.version,me.name,now);
    else if(b.action==='review_message')await reviewMessage(db,b.id,b.version,b.reason,me.name,now);
    else {
      const r=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;
      if(!r)throw new AppError('Solicitação não encontrada.',404);
      if(r.version!==b.version)throw new AppError('Solicitação atualizada. Recarregue.',409);
      if(b.action==='supplier_categories')await setSupplierCategories(db,r,b.categories,me.name,now);
      else if(b.action==='research_item'||b.action==='research'&&b.criteria){await configureEstimateResearch(db,r,b.criteria,b.action==='research_item'?z.number().int().nonnegative().parse(b.itemIndex):undefined,me.name,now)}
      else if(b.action==='research'){if(r.status==='pending')await startEstimateSearch(db,r,me.name,now);else await enqueueSearch(db,r,me.name,now)}
      else if(b.action==='prepare_openclaw'&&b.recipients!==undefined)await enqueueSelectedContacts(db,r,b.recipients,me.name,now,env,b.preparationId);
      else if(b.supplierIds!==undefined)await enqueueQuotations(db,r,all.filter(s=>s.kind==='supplier'),b.supplierIds,me.name,now,env);
      else {const s=all.find(s=>s.id===b.supplierId&&s.kind==='supplier');if(!s)throw new AppError('Fornecedor não encontrado.');await enqueueQuotation(db,r,s,me.name,now,env)}
    }
    return Response.json({ok:true});
  }
  let id:string=crypto.randomUUID(),kind='',data:any,action='',old:any;
  if(b.action==='request'||b.action==='master_submit_draft'){
    const masterSubmit=b.action==='master_submit_draft';if(masterSubmit&&me.role!=='admin')throw new AppError('Somente o Master pode encaminhar rascunhos de outros usuários.',403);
    const masterReason=masterSubmit?z.string().trim().min(5,'Informe a justificativa do encaminhamento pelo Master (mínimo 5 caracteres).').max(2000).parse(b.reason):undefined;
    if(masterSubmit&&!b.draftId)throw new AppError('Selecione um rascunho.');
    if(!canCreateRequest(me.role))throw new AppError('Seu perfil permite apenas aprovar ou recusar pedidos.',403);
    if(b.draftId){
      const draft=all.find(r=>r.id===b.draftId);
      if(!draft||(!masterSubmit&&draft.authorId!==me.id))throw new AppError('Rascunho não encontrado.',404);
      if(draft.kind==='request')return Response.json({ok:true,id:draft.id});
      if(draft.kind==='request_draft'&&draft.sourceRequestId)throw new AppError('Esta revisão pertence ao pedido original. Reabra a solicitação adiada para revisar e reapresentar no mesmo protocolo.',409);
      if(draft.kind!=='request_draft'||draft.version!==b.draftVersion)throw new AppError('Rascunho atualizado em outra aba. Reabra para conferir.',409);
      if(draft.archivedAt&&!masterSubmit)throw new AppError('Restaure o rascunho antes de enviá-lo.',409);
      if(!masterSubmit&&draft.status==='deferred'&&!canSubmitDeferredDraft(draft,now))throw new AppError(`Este rascunho adiado poderá ser enviado a partir de ${String(draft.availableMonth).split('-').reverse().join('/')}.`,409);
      old=draft;id=draft.id;
    }
    const input=requestSchema.parse(b.data);const form=parseBudgetForm(b.data?.form,input.items,{at:now});if(closedBudgetMonth(budgetRecords,String(form.fields.referenceMonth)))throw new AppError('O mês está fechado. Reabra antes de incluir solicitações.');if(!settings.departments.includes(input.department))throw new AppError('Selecione um setor cadastrado.');
    if(me.role==='solicitante'&&input.department!==me.department)throw new AppError('Você só pode solicitar para seu setor.',403);
    kind='request';data={...input,priority:form.kind==='emergency'?'Emergencial':form.fields.requestPriority,form,formDeclared:{actor:me.name,at:now},code:'CE-'+id.slice(0,8).toUpperCase(),authorId:masterSubmit?old.authorId:me.id,authorName:masterSubmit?(all.find(user=>user.id===old.authorId&&user.kind==='local_user')?.name||old.authorName||'Autor original'):me.name,status:'pending',quotes:[],createdAt:now,updatedAt:now,...(old?.status==='deferred'?{reusedFrom:{requestId:old.sourceRequestId,code:old.sourceCode,deferredAt:old.deferredAt}}:{})};action=old?.status==='deferred'?'Nova solicitação criada a partir do pedido adiado '+old.sourceCode:'Solicitação criada; aguardando a Diretoria Administrativa iniciar a estimativa';
    if(masterSubmit){data.correctionHistory=[{at:now,actor:me.name,reason:'Encaminhamento pelo Master: '+masterReason,previous:{draft:old}}];action='Master encaminhou rascunho do setor para análise administrativa; aceite confirmado por '+me.name+': '+masterReason;}
  }else if(b.action==='reapply_deferred'){
    old=target;if(!old)throw new AppError('Solicitação não encontrada.',404);
    if(me.role!=='admin'&&old.authorId!==me.id)throw new AppError('Seu perfil não permite reapresentar este pedido.',403);
    if(!canCreateRequest(me.role))throw new AppError('Seu perfil não permite reapresentar este pedido.',403);
    if(old.status!=='deferred'&&typeof b.roundAt==='string'&&old.roundHistory?.at(-1)?.previous.deferred?.at===b.roundAt)return Response.json({ok:true,id:old.id});
    if(b.version!==old.version||b.roundAt!==old.deferred?.at)throw new AppError('Solicitação atualizada. Reabra para conferir.',409);
    data=reapplyDeferredRequest(old,b.data,me,now,b.reason);
    if(!settings.departments.includes(data.department)||b.data?.department!==old.department)throw new AppError('Mantenha o setor original cadastrado.');
    id=old.id;kind='request';action='Solicitação reapresentada no mesmo protocolo para nova estimativa e aprovações; rodada anterior preservada: '+(me.role==='admin'?b.reason:'Envio do setor solicitante');
  }else if(b.action==='resubmit_request'){
    old=target;if(!old)throw new AppError('Solicitação não encontrada.',404);
    if(!canCreateRequest(me.role)||(me.role==='solicitante'&&old.authorId!==me.id))throw new AppError('Seu perfil não permite complementar este pedido.',403);
    if(old.status!=='correction'||old.generalApproval)throw new AppError('Aguarde a devolução para complementar.');
    if(b.version!==old.version)throw new AppError('Solicitação atualizada. Recarregue.',409);
    const input=requestSchema.parse(b.data);if(!settings.departments.includes(input.department)||(me.role==='solicitante'&&input.department!==me.department))throw new AppError('Setor inválido.',403);
    const form=parseBudgetForm({...b.data.form,fields:{...b.data.form?.fields,referenceMonth:old.form?.fields.referenceMonth||b.data.form?.fields.referenceMonth,situation:'Complementação',originalRequestId:old.code}},input.items,{at:now,previous:old.form,createdAt:old.createdAt,requestCode:old.code});
    if(!form.fields.correctionResponse)throw new AppError('Responda às pendências da complementação.');
    if(closedBudgetMonth(budgetRecords,String(old.management?.referenceMonth||form.fields.referenceMonth)))throw new AppError('O mês está fechado. Reabra antes de alterar.');
    id=old.id;kind='request';data={...old,...input,priority:form.kind==='emergency'?'Emergencial':form.fields.requestPriority,form,formDeclared:{actor:me.name,at:now},status:'pending',updatedAt:now,estimateRevision:now,management:{...old.management},correctionHistory:[...(old.correctionHistory||[]),{at:now,actor:me.name,reason:String(form.fields.correctionResponse),previous:{form:old.form,items:old.items,estimate:old.estimate,adminReview:old.adminReview,management:old.management,title:old.title,reason:old.reason,neededBy:old.neededBy}}]};
    const sameQuantities=old.items.length===input.items.length&&old.items.every((item:Purchase['items'][number],index:number)=>item.quantity===input.items[index]?.quantity);
    for(const key of ['additionalDataStatus','reviewNotes','complementDeadline','reviewOwner','reviewDate'])delete data.management[key];
    if(!sameQuantities)for(const key of ['quantityAssessment',...Object.keys(data.management).filter(key=>/^recommendedQuantity_\d+$/.test(key))])delete data.management[key];
    if(!Object.keys(data.management).length)delete data.management;
    delete data.estimate;delete data.adminReview;delete data.generalApproval;delete data.returnForCorrection;delete data.needDecision;delete data.deferred;action='Solicitação complementada pelo setor; aguardando a Diretoria Administrativa iniciar nova estimativa';
  }else if(b.action==='supplier'){
    permit(['admin','administrativo']);const input=supplierSchema.parse(b.data);
    return Response.json({ok:true,...await saveAgendaContact(db,{classification:'supplier',data:input},me.name,now)});
  }else if(b.action==='member'){
    throw new AppError('Use Pessoas e acessos para administrar os usuários locais.',400);
  }else if(b.action==='estimate_settings'){
    // Ticket 06: percentual padrão de frete, somente pelo Master, com autoria e data em
    // estimateSettingsHistory; campo ausente remove o valor. O CEP comercial é constante do
    // sistema (ticket 07): CEP enviado é ignorado e o schoolCep salvo antes fica preservado.
    permit(['admin']);const input=estimateSettingsSchema.parse(b.data);
    const raw=(await db.prepare('SELECT data FROM school WHERE id=1').first<{data:string}>())!.data,settings=JSON.parse(raw) as Settings;
    const previous=typeof settings.freightPercent==='number'?{freightPercent:settings.freightPercent}:{};
    const next=typeof input.freightPercent==='number'?{freightPercent:input.freightPercent}:{};
    if(JSON.stringify(previous)===JSON.stringify(next))return Response.json({ok:true});
    const {freightPercent:_percent,...rest}=settings;
    const saved:Settings={...rest,...next,estimateSettingsHistory:[...(settings.estimateSettingsHistory||[]),{actor:me.name,at:now,previous,next}]};
    const describe=(v:typeof next)=>`frete ${typeof v.freightPercent==='number'?v.freightPercent+'%':'não configurado'}`;
    const result=await db.batch([db.prepare('UPDATE school SET data=? WHERE id=1 AND data=?').bind(JSON.stringify(saved),raw),db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(id,'school',me.name,'Configuração da estimativa atualizada: '+describe(previous)+' → '+describe(next),now)]);
    if(result[0].meta.changes!==1)throw new AppError('As configurações foram atualizadas em outra aba. Recarregue a página.',409);
    return Response.json({ok:true});
  }else if(b.action==='icms_settings'){
    // Ticket 08: chave do cálculo do ICMS (padrão desligada) e tabela de alíquotas por vigência,
    // somente pelo Master, com autoria e data em estimateSettingsHistory. A tabela da mesma data
    // inicial é substituída (a anterior fica no histórico); as demais vigências permanecem.
    // Ligar exige tabela vigente hoje (Manaus).
    permit(['admin']);const input=icmsSettingsSchema.parse(b.data);
    const raw=(await db.prepare('SELECT data FROM school WHERE id=1').first<{data:string}>())!.data,settings=JSON.parse(raw) as Settings;
    let tables=[...(settings.icmsTables||[])];
    const previous:EstimateSettingsValue={icmsEnabled:settings.icmsEnabled===true},next:EstimateSettingsValue={icmsEnabled:input.enabled};
    if(input.table){
      const interstate=Object.fromEntries(Object.entries(input.table.interstate).sort(([a],[b])=>a.localeCompare(b)));
      const table:IcmsTable={validFrom:input.table.validFrom,internalRate:input.table.internalRate,interstate,exceptions:input.table.exceptions,savedBy:me.name,savedAt:now};
      const before=tables.find(t=>t.validFrom===table.validFrom),plain=(t?:IcmsTable)=>t&&JSON.stringify({validFrom:t.validFrom,internalRate:t.internalRate,interstate:t.interstate,exceptions:t.exceptions||[]});
      if(plain(before)!==plain(table)){
        if(before)previous.icmsTable=before;
        next.icmsTable=table;
        tables=[...tables.filter(t=>t.validFrom!==table.validFrom),table].sort((a,b)=>a.validFrom.localeCompare(b.validFrom));
      }
    }
    if(input.enabled&&!currentIcmsTable(tables,new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date(now))))throw new AppError('Cadastre a tabela de ICMS vigente antes de ligar o cálculo.',400);
    if(previous.icmsEnabled===next.icmsEnabled&&!next.icmsTable)return Response.json({ok:true});
    const saved:Settings={...settings,icmsEnabled:input.enabled,icmsTables:tables,estimateSettingsHistory:[...(settings.estimateSettingsHistory||[]),{actor:me.name,at:now,previous,next}]};
    const summary='Configuração do ICMS atualizada: cálculo '+(previous.icmsEnabled?'ligado':'desligado')+' → '+(next.icmsEnabled?'ligado':'desligado')+(next.icmsTable?'; '+icmsTableLabel(next.icmsTable):'');
    const result=await db.batch([db.prepare('UPDATE school SET data=? WHERE id=1 AND data=?').bind(JSON.stringify(saved),raw),db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(id,'school',me.name,summary,now)]);
    if(result[0].meta.changes!==1)throw new AppError('As configurações foram atualizadas em outra aba. Recarregue a página.',409);
    return Response.json({ok:true});
  }else if(b.action==='settings'){
    permit(['admin']);const input=z.object({minQuotes:z.number().int().min(1).max(10),departments:z.array(z.string().trim().min(2).max(80)).min(1).max(50),holidays:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100).default([])}).parse(b.data);
    if((await listLocalUsers(db)).some(r=>!input.departments.includes(r.department)))throw new AppError('Há usuários vinculados a um setor que seria removido. Atualize seus acessos primeiro.');
    await db.batch([db.prepare('UPDATE school SET data=? WHERE id=1').bind(JSON.stringify({...settings,...input,departments:[...new Set(input.departments)]})),db.prepare('INSERT INTO audit (id,entity,actor,action,at) VALUES (?,?,?,?,?)').bind(id,'school',me.name,'Regras e setores atualizados',now)]);return Response.json({ok:true});
  }else{
    old=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;if(!old)throw new AppError('Solicitação não encontrada.',404);
    if(old.version!==b.version)throw new AppError('Esta solicitação foi atualizada. Recarregue antes de continuar.',409);
    id=old.id;kind='request';data={...old,updatedAt:now};
    const result=transition(old,b,me,all.filter(r=>r.kind==='supplier'),settings,now);data=result.data;action=result.action;
  }
  if(kind==='request'&&!archiveAction&&closedBudgetMonth(budgetRecords,budgetMonth(data)))throw new AppError('O mês está fechado. Reabra antes de alterar.');
  const openMonthGuard=" AND NOT EXISTS(SELECT 1 FROM records AS closing WHERE closing.kind='budget_closing' AND json_extract(closing.data,'$.month')=? AND json_extract(closing.data,'$.status')='Concluído')";
  const write=old?db.prepare('UPDATE records SET kind=?,data=?,version=version+1 WHERE id=? AND version=?'+(kind==='request'&&!archiveAction?openMonthGuard+openMonthGuard:'')).bind(kind,JSON.stringify(data),id,old.version,...(kind==='request'&&!archiveAction?[budgetMonth(old)||'',budgetMonth(data)||'']:[])):db.prepare('INSERT INTO records (id,kind,data,version) SELECT ?,?,?,1'+(kind==='request'?' WHERE NOT EXISTS(SELECT 1 FROM records AS closing WHERE closing.kind=\'budget_closing\' AND json_extract(closing.data,\'$.month\')=? AND json_extract(closing.data,\'$.status\')=\'Concluído\')':'')).bind(id,kind,JSON.stringify(data),...(kind==='request'?[budgetMonth(data)||'']:[]));
  const log=db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,me.name,action,now);
  const result=await db.batch([write,log]);if(result[0].meta.changes!==1)throw new AppError('Outra pessoa atualizou este registro ou o mês foi fechado. Recarregue a página.',409);
  return Response.json({ok:true,id});
}catch(e){return fail(e)}}
