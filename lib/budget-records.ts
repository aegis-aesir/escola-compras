import { z } from 'zod';
import { FlowError, todayManaus } from '../app/workflow';
import type { Purchase, Settings } from '../app/model';
import { closingBlockers, fiscalMatrix, invoiceBlockers, monthSummary, referenceMonth, validNeed, type BudgetRecord, type BudgetClosing } from '../app/budget-month';
const text=z.string().trim().max(4000),required=z.string().trim().min(5,'Informe pelo menos 5 caracteres.').max(4000);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Data inválida.');
const optionalDate=z.union([z.literal(''),date]);const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);const amount=z.number().finite().nonnegative().max(1000000000).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001,'Use no máximo duas casas decimais.');
const check=z.object({status:z.enum(['Pendente','Sim','Não','N/A']),reason:text.optional(),document:text.optional(),authorization:text.optional()}).strict();
export const budgetInvoiceSchema=z.object({requestId:z.string().min(1).max(100),requestVersion:z.number().int().positive(),month,supplier:z.string().trim().min(2).max(300),number:z.string().trim().min(1).max(100),issuedOn:date,amount,dueOn:date,documentType:z.string().trim().min(2).max(100),scenario:z.string().refine(v=>fiscalMatrix.some(s=>s.id===v),'Cenário fiscal inválido.'),received:check,correctCnpj:check,xml:check,accountingStatus:z.enum(['Pendente','Validado','Ajustar','Consulta não necessária']),accountingReference:text,accountingResponsible:text,accountingReason:text.optional(),sentToAccountingOn:optionalDate,taxGuide:text,taxDueOn:optionalDate,released:z.boolean(),paymentStatus:z.enum(['Pendente','Programado','Pago','Cancelado']),paidOn:optionalDate,notes:text,documents:z.array(z.string().trim().min(3).max(2000)).max(30)});
const followup=z.object({requestId:z.string().min(1),invoiceId:text,amount:amount.nullable(),owner:required,nextAction:required,deadline:date,reason:required});
export const budgetClosingSchema=z.object({month,status:z.enum(['Rascunho','Concluído']),evaluation:text,results:text,attention:text,measures:text,deviations:text,conclusion:text,recommendations:text,generalQuestions:text,determinations:text,actions:z.array(z.object({id:z.string().max(100),action:required,owner:required,deadline:date,status:z.enum(['Pendente','Em andamento','Concluída']),tracking:text})).max(100),followups:z.array(followup).max(300)});
type RecordRow={id:string;kind:string;version:number;data:string};
export async function readBudgetRecords(db:D1Database):Promise<BudgetRecord[]>{
 const result=await db.prepare("SELECT id,kind,version,data FROM records WHERE kind IN ('budget_invoice','budget_closing') ORDER BY id").all<RecordRow>();
 return result.results.map(r=>({id:r.id,kind:r.kind,version:r.version,data:JSON.parse(r.data)} as BudgetRecord));
}
export function closedBudgetMonth(records:BudgetRecord[],month:string|null){return !!month&&records.some(n=>n.kind==='budget_closing'&&n.data.month===month&&n.data.status==='Concluído');}
export async function budgetRecordsAction(db:D1Database,payload:unknown,me:{id:string;name:string;role:string},requests:Purchase[],settings:Settings,now:string):Promise<{id:string}>{
 if(!['admin','administrativo'].includes(me.role))throw new FlowError('Seu perfil não permite controles fiscais ou fechamento.',403);
 const b=z.object({action:z.enum(['budget_invoice','budget_closing','budget_reopen']),id:z.string().max(100).optional(),version:z.number().int().positive().optional(),data:z.unknown()}).parse(payload);
 const records=await readBudgetRecords(db);let id=b.id||crypto.randomUUID(),kind='',data:unknown,action='';let old=records.find(r=>r.id===id);
 if(b.id&&!old)throw new FlowError('Registro não encontrado.',404);
 if(old&&old.version!==b.version)throw new FlowError('Este registro foi atualizado. Recarregue.',409);
 let request:Purchase|undefined;
 const author={recordedBy:me.name,recordedById:me.id,recordedAt:now};
 if(b.action==='budget_invoice'){
  kind='budget_invoice';if(old&&old.kind!==kind)throw new FlowError('Tipo de registro inválido.');
  const additional=z.object({additionalScenarios:z.array(z.string().refine(v=>fiscalMatrix.some(s=>s.id===v),'Cenário adicional inválido.')).max(12).optional()}).parse(b.data);
  const n={...budgetInvoiceSchema.parse(b.data),additionalScenarios:additional.additionalScenarios||[]};request=requests.find(r=>r.id===n.requestId);if(!request)throw new FlowError('Solicitação não encontrada.',404);
  if(request.archived)throw new FlowError('Solicitação arquivada. Restaure antes de alterar os documentos fiscais.',409);
  if(n.requestVersion!==request.version)throw new FlowError('A solicitação foi atualizada. Recarregue.',409);
  if(old?.kind==='budget_invoice'&&old.data.requestId!==n.requestId)throw new FlowError('A nota não pode ser transferida para outra solicitação.');
  if(closedBudgetMonth(records,n.month)||(old?.kind==='budget_invoice'&&closedBudgetMonth(records,old.data.month)))throw new FlowError('Reabra o fechamento mensal com justificativa antes de alterar a nota.');
  if(n.issuedOn>todayManaus(now)||n.paidOn>todayManaus(now)||n.sentToAccountingOn>todayManaus(now))throw new FlowError('Emissão, pagamento e envio não podem estar no futuro em Manaus.');
  if(n.paidOn&&n.paidOn<n.issuedOn)throw new FlowError('O pagamento deste documento não pode anteceder sua emissão. Registre adiantamento como documento próprio.');
  if(n.paymentStatus==='Pago'&&!n.paidOn)throw new FlowError('Informe a data do pagamento registrado.');
  if(n.paymentStatus!=='Pago'&&n.paidOn)throw new FlowError('Data de pagamento exige status Pago.');
  if(n.released||n.paymentStatus==='Pago'){
   if(!validNeed(request))throw new FlowError('A necessidade precisa de aprovação válida antes da liberação ou pagamento.');
   const blockers=invoiceBlockers(n);if(blockers.length)throw new FlowError(blockers.join(' '));
   if(n.paymentStatus==='Pago'&&!n.released)throw new FlowError('Pagamento exige liberação contábil válida.');
  }
  const previous=old?.kind==='budget_invoice'?old.data:undefined;const {history,...prior}=previous||{};
  data={...n,...author,history:previous?[...(history||[]),prior]:[]};action=`Controle fiscal ${old?'atualizado':'registrado'}: ${n.number}; ${n.paymentStatus}; autor ${me.id}`;
 }else{
  kind='budget_closing';if(old&&old.kind!==kind)throw new FlowError('Tipo de registro inválido.');
  if(b.action==='budget_reopen'){
   const input=z.object({month,reason:required}).parse(b.data);
   if(old?.kind!=='budget_closing'||old.data.status!=='Concluído'||old.data.month!==input.month)throw new FlowError('Selecione um fechamento concluído para reabrir.');
   const {history,...previous}=old.data;data={...previous,...author,status:'Reaberto',reopenReason:input.reason,history:[...(history||[]),previous]};action=`Fechamento ${input.month} reaberto: ${input.reason}; autor ${me.id}`;
  }else{
   const c=budgetClosingSchema.parse(b.data);const existing=records.find(n=>n.kind==='budget_closing'&&n.data.month===c.month);
   if(existing&&!old)throw new FlowError('Já existe fechamento deste mês. Recarregue para editar.',409);
   if(old?.kind==='budget_closing'&&(old.data.month!==c.month||old.data.status==='Concluído'))throw new FlowError('Reabra o fechamento com justificativa antes de alterar.');
   if(!old){id='budget-closing-'+c.month;old=records.find(n=>n.id===id);}
   if(c.status==='Concluído'){
    for(const key of ['evaluation','results','attention','measures','deviations','conclusion','recommendations','generalQuestions','determinations'] as const)required.parse(c[key]);
    const blockers=closingBlockers(requests,records,c,now);if(blockers.length)throw new FlowError(blockers.join(' '));
   }
   data={...c,...author,snapshot:monthSummary(requests,records,c.month,settings,now),history:old?.kind==='budget_closing'?old.data.history||[]:[]};action=`Fechamento ${c.month}: ${c.status}; autor ${me.id}`;
  }
 }
 const serialized=JSON.stringify(data);const guards:string[]=[];const guardValues:(string|number)[]=[];
 if(request){guards.push("EXISTS (SELECT 1 FROM records WHERE id=? AND kind='request' AND version=?)");guardValues.push(request.id,request.version);}
 if(kind==='budget_invoice'){
  const months=[(data as {month:string}).month,...(old?.kind==='budget_invoice'?[old.data.month]:[])];
  for(const m of new Set(months)){guards.push("NOT EXISTS (SELECT 1 FROM records WHERE kind='budget_closing' AND json_extract(data,'$.month')=? AND json_extract(data,'$.status')='Concluído')");guardValues.push(m);}
 }else if(b.action==='budget_closing'){
  // Snapshot and source versions are verified by the same D1 statement as the write.
  const m=(data as BudgetClosing).month,rs=requests.filter(r=>referenceMonth(r)===m),ns=records.filter(n=>n.kind==='budget_invoice'&&n.data.month===m);
  const versions=[...rs,...ns].map(r=>({id:r.id,version:r.version}));
  guards.push("NOT EXISTS (SELECT 1 FROM json_each(?) v LEFT JOIN records r ON r.id=json_extract(v.value,'$.id') AND r.version=json_extract(v.value,'$.version') WHERE r.id IS NULL)");guardValues.push(JSON.stringify(versions));
  guards.push("(SELECT COUNT(*) FROM records WHERE kind='request' AND coalesce(json_extract(data,'$.management.referenceMonth'),json_extract(data,'$.form.fields.referenceMonth'))=?)=?");guardValues.push(m,rs.length);
  guards.push("(SELECT COUNT(*) FROM records WHERE kind='budget_invoice' AND json_extract(data,'$.month')=?)=?");guardValues.push(m,ns.length);
 }
 const where=guards.length?' AND '+guards.join(' AND '):'';
 const write=old?db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND kind=? AND version=?'+where).bind(serialized,id,kind,old.version,...guardValues):db.prepare('INSERT INTO records (id,kind,data,version) SELECT ?,?,?,1 WHERE NOT EXISTS (SELECT 1 FROM records WHERE id=?)'+where).bind(id,kind,serialized,id,...guardValues);
 const log=db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,me.name,action,now);
 const result=await db.batch([write,log]);if(result[0].meta.changes!==1)throw new FlowError('Dados alterados ou mês fechado por outra pessoa. Recarregue.',409);
 return {id};
}
