import { env } from 'cloudflare:workers';
import { currentLocalUser } from '../../local-session';
import {parseBudgetForm,budgetMonth} from '../../budget';
import {budgetRecordsAction,readBudgetRecords,closedBudgetMonth} from '../../../lib/budget-records';
import { listLocalUsers } from '../../../lib/local-auth';
import { visibleRequests, canCreateRequest } from '../../access';
import { requestSchema, supplierSchema, quoteSchema, quoteTotal, sectors, type Purchase, type Supplier, type Settings } from '../../model';
import { z } from 'zod';
import { transition, FlowError, localExpired } from '../../workflow';
import { advanceDeadlines, enqueueSearch, enqueueQuotation, integrationSnapshot, retryJob, reviewMessage, setSupplierCategories, registerDiscoveredSupplier } from '../../../lib/integrations';
export const dynamic = 'force-dynamic';
const initial:Settings = {name:'Colégio Estrelas',legalName:'Centro Educacional Estrelas do Amanhã LTDA',minQuotes:3,departments:sectors};
class AppError extends Error {constructor(message:string,public status=400){super(message)}}
async function context(){
  const user=await currentLocalUser(); if(!user)throw new AppError('Entre com seu usuário e senha.',401);
  if(user.mustChangePassword)throw new AppError('Altere sua senha temporária antes de continuar.',403);
  const db=env.DB!;
  const school=await db.prepare('SELECT * FROM school WHERE id=1').first<{owner:string;data:string}>();
  if(!school)throw new AppError('A escola ainda não foi inicializada.',503);
  const rows=await db.prepare('SELECT * FROM records').all<{id:string;kind:string;data:string;version:number}>();
  const all=rows.results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,version:r.version}));
  const me={id:user.id,name:user.name,username:user.username,email:'',role:user.role,department:user.department};
  return {db,all,me,settings:JSON.parse(school!.data) as Settings};
}
function fail(e:unknown){if(e instanceof z.ZodError)return Response.json({error:e.issues[0]?.message||'Confira os campos.'},{status:400}); if(e instanceof Error&&'status'in e&&e.status===400)return Response.json({error:e.message},{status:400}); if(e instanceof AppError || e instanceof FlowError)return Response.json({error:e.message},{status:e.status}); console.error('Data operation failed',e instanceof Error?e.message:'unknown');return Response.json({error:'Não foi possível salvar. Tente novamente.'},{status:500});}
export async function GET(){try{
  let {db,all,me,settings}=await context();
  if(['admin','administrativo'].includes(me.role)&&await advanceDeadlines(db,new Date().toISOString()))({all}=await context());
  const requests=visibleRequests(all.filter(r=>r.kind==='request'),me);
  const budgetRecords=['admin','administrativo'].includes(me.role)?await readBudgetRecords(db):undefined;
  const activity=await db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 200').all();
  const management=['admin','administrativo'].includes(me.role);
  return Response.json({requests,budgetRecords,suppliers:management?all.filter(r=>r.kind==='supplier'):[],members:me.role==='admin'?await listLocalUsers(db):[],settings:me.role==='solicitante'?{...settings,departments:[me.department]}:settings,me,integrations:management?await integrationSnapshot(db,env):undefined,activity:management?activity.results:[]},{headers:{'Cache-Control':'no-store'}});
}catch(e){return fail(e)}}
export async function POST(req:Request){try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new AppError('Origem inválida.',403);
  if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError('Formato inválido.');
  const raw=await req.text();if(raw.length>100000)throw new AppError('Solicitação muito grande.');
  let b:any;try{b=JSON.parse(raw)}catch{throw new AppError('Conteúdo inválido.')}
  const {db,all,me,settings}=await context();const now=new Date().toISOString();
  const budgetRecords=await readBudgetRecords(db);
  if(['budget_invoice','budget_closing','budget_reopen'].includes(b.action))return Response.json({ok:true,...await budgetRecordsAction(db,b,me,all.filter(r=>r.kind==='request'),settings,now)});
  const target=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;
  if(target&&closedBudgetMonth(budgetRecords,budgetMonth(target)))throw new AppError('Reabra o fechamento mensal com justificativa antes de alterar o pedido.');
  const permit=(roles:string[])=>{if(!roles.includes(me.role))throw new AppError('Seu perfil não permite esta ação.',403)};
  if(['research','prepare_openclaw','retry_integration','review_message','supplier_categories','register_discovered_supplier'].includes(b.action)){
    permit(['admin','administrativo']);
    if(b.action==='register_discovered_supplier')return Response.json({ok:true,id:await registerDiscoveredSupplier(db,b.jobId,b.sourceIndex,b.data,me.name,now)});
    if(b.action==='retry_integration')await retryJob(db,b.id,b.version,me.name,now,env);
    else if(b.action==='review_message')await reviewMessage(db,b.id,b.version,b.reason,me.name,now);
    else {
      const r=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;
      if(!r)throw new AppError('Solicitação não encontrada.',404);
      if(r.version!==b.version)throw new AppError('Solicitação atualizada. Recarregue.',409);
      if(b.action==='supplier_categories')await setSupplierCategories(db,r,b.categories,me.name,now);
      else if(b.action==='research')await enqueueSearch(db,r,me.name,now);
      else {const s=all.find(s=>s.id===b.supplierId&&s.kind==='supplier');if(!s)throw new AppError('Fornecedor não encontrado.');await enqueueQuotation(db,r,s,me.name,now,env)}
    }
    return Response.json({ok:true});
  }
  let id:string=crypto.randomUUID(),kind='',data:any,action='',old:any;
  if(b.action==='request'){
    if(!canCreateRequest(me.role))throw new AppError('Seu perfil permite apenas aprovar ou recusar pedidos.',403);
    const input=requestSchema.parse(b.data);const form=parseBudgetForm(b.data?.form,input.items,{at:now});if(closedBudgetMonth(budgetRecords,String(form.fields.referenceMonth)))throw new AppError('O mês está fechado. Reabra antes de incluir solicitações.');if(!settings.departments.includes(input.department))throw new AppError('Selecione um setor cadastrado.');
    if(me.role==='solicitante'&&input.department!==me.department)throw new AppError('Você só pode solicitar para seu setor.',403);
    kind='request';data={...input,priority:form.kind==='emergency'?'Emergencial':form.fields.requestPriority,form,formDeclared:{actor:me.name,at:now},code:'CE-'+id.slice(0,8).toUpperCase(),authorId:me.id,authorName:me.name,status:'estimating',quotes:[],createdAt:now,updatedAt:now};action='Solicitação criada';
  }else if(b.action==='resubmit_request'){
    old=target;if(!old)throw new AppError('Solicitação não encontrada.',404);
    if(!canCreateRequest(me.role)||(me.role==='solicitante'&&old.authorId!==me.id))throw new AppError('Seu perfil não permite complementar este pedido.',403);
    if(old.status!=='correction'||old.generalApproval)throw new AppError('Aguarde a devolução para complementar.');
    if(b.version!==old.version)throw new AppError('Solicitação atualizada. Recarregue.',409);
    const input=requestSchema.parse(b.data);if(!settings.departments.includes(input.department)||(me.role==='solicitante'&&input.department!==me.department))throw new AppError('Setor inválido.',403);
    const form=parseBudgetForm({...b.data.form,fields:{...b.data.form?.fields,referenceMonth:old.form?.fields.referenceMonth||b.data.form?.fields.referenceMonth,situation:'Complementação',originalRequestId:old.code}},input.items,{at:now,previous:old.form,createdAt:old.createdAt,requestCode:old.code});
    if(!form.fields.correctionResponse)throw new AppError('Responda às pendências da complementação.');
    if(closedBudgetMonth(budgetRecords,String(old.management?.referenceMonth||form.fields.referenceMonth)))throw new AppError('O mês está fechado. Reabra antes de alterar.');
    id=old.id;kind='request';data={...old,...input,priority:form.kind==='emergency'?'Emergencial':form.fields.requestPriority,form,formDeclared:{actor:me.name,at:now},status:'estimating',updatedAt:now,estimateRevision:now,correctionHistory:[...(old.correctionHistory||[]),{at:now,actor:me.name,reason:String(form.fields.correctionResponse),previous:{form:old.form,items:old.items,estimate:old.estimate,adminReview:old.adminReview,management:old.management,title:old.title,reason:old.reason,neededBy:old.neededBy}}]};
    delete data.estimate;delete data.adminReview;delete data.management;if(old.management?.referenceMonth)data.management={referenceMonth:old.management.referenceMonth};delete data.generalApproval;delete data.returnForCorrection;delete data.needDecision;delete data.deferred;action='Solicitação complementada pelo setor; encaminhada para nova estimativa';
  }else if(b.action==='supplier'){
    permit(['admin','administrativo']);kind='supplier';data=supplierSchema.parse(b.data);action='Fornecedor cadastrado';
  }else if(b.action==='member'){
    throw new AppError('Use Pessoas e acessos para administrar os usuários locais.',400);
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
  if(kind==='request'&&closedBudgetMonth(budgetRecords,budgetMonth(data)))throw new AppError('O mês está fechado. Reabra antes de alterar.');
  const openMonthGuard=" AND NOT EXISTS(SELECT 1 FROM records AS closing WHERE closing.kind='budget_closing' AND json_extract(closing.data,'$.month')=? AND json_extract(closing.data,'$.status')='Concluído')";
  const write=old?db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?'+(kind==='request'?openMonthGuard+openMonthGuard:'')).bind(JSON.stringify(data),id,old.version,...(kind==='request'?[budgetMonth(old)||'',budgetMonth(data)||'']:[])):db.prepare('INSERT INTO records (id,kind,data,version) SELECT ?,?,?,1'+(kind==='request'?' WHERE NOT EXISTS(SELECT 1 FROM records AS closing WHERE closing.kind=\'budget_closing\' AND json_extract(closing.data,\'$.month\')=? AND json_extract(closing.data,\'$.status\')=\'Concluído\')':'')).bind(id,kind,JSON.stringify(data),...(kind==='request'?[budgetMonth(data)||'']:[]));
  const log=db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,me.name,action,now);
  const result=await db.batch([write,log]);if(result[0].meta.changes!==1)throw new AppError('Outra pessoa atualizou este registro. Recarregue a página.',409);
  return Response.json({ok:true,id});
}catch(e){return fail(e)}}
