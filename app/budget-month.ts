import type { Purchase, Settings } from './model';
import { requestedTotal } from './budget';
import {quoteComparable} from './quote-comparison';

export type FiscalCheck = {status:'Pendente'|'Sim'|'Não'|'N/A';reason?:string;document?:string;authorization?:string};
export type BudgetInvoice = {
 requestId:string;requestVersion:number;month:string;supplier:string;number:string;issuedOn:string;amount:number;dueOn:string;documentType:string;scenario:string;additionalScenarios?:string[];
 received:FiscalCheck;correctCnpj:FiscalCheck;xml:FiscalCheck;accountingStatus:'Pendente'|'Validado'|'Ajustar'|'Consulta não necessária';accountingReference:string;accountingResponsible:string;accountingReason?:string;
 sentToAccountingOn:string;taxGuide:string;taxDueOn:string;released:boolean;paymentStatus:'Pendente'|'Programado'|'Pago'|'Cancelado';paidOn:string;notes:string;documents:string[];recordedBy?:string;recordedById?:string;recordedAt?:string;history?:BudgetInvoice[];
};
export type BudgetFollowup={requestId:string;invoiceId:string;amount:number|null;owner:string;nextAction:string;deadline:string;reason:string};
export type BudgetCorrectiveAction={id:string;action:string;owner:string;deadline:string;status:'Pendente'|'Em andamento'|'Concluída';tracking:string};
export type BudgetClosing={month:string;status:'Rascunho'|'Concluído'|'Reaberto';evaluation:string;results:string;attention:string;measures:string;deviations:string;conclusion:string;recommendations:string;generalQuestions:string;determinations:string;actions:BudgetCorrectiveAction[];followups:BudgetFollowup[];snapshot?:MonthSummary;recordedBy?:string;recordedById?:string;recordedAt?:string;reopenReason?:string;history?:BudgetClosing[]};
export type BudgetRecord={id:string;version:number}&({kind:'budget_invoice';data:BudgetInvoice}|{kind:'budget_closing';data:BudgetClosing});
export type FiscalScenario={id:string;name:string;alert:string;conduct:string;documents:string;responsible:string;payment:string;requiresReturn:boolean};
// Textos da aba Orientações Fiscais da matriz original, sem interpretação tributária.
export const fiscalMatrix:FiscalScenario[]=[
 {id:'amazonas',name:'Mercadoria comprada no Amazonas',alert:'NF com dados divergentes, imposto destacado de forma incomum ou fornecedor irregular',conduct:'Conferir pedido, recebimento, NF e XML. Consultar a Contabilidade se houver divergência.',documents:'NF-e e XML; pedido/ID da compra',responsible:'Administrativo + Financeiro',payment:'Liberar após conferência; bloquear se houver divergência',requiresReturn:false},
 {id:'interestadual',name:'Mercadoria comprada de outro estado',alert:'Possibilidade de DIFAL, antecipação de ICMS, substituição tributária ou guia adicional',conduct:'Enviar NF/XML à Contabilidade antes de pagar e aguardar orientação sobre tributo e vencimento.',documents:'NF-e, XML, pedido/ID e finalidade do item',responsible:'Financeiro',payment:'Bloqueado até retorno da Contabilidade',requiresReturn:true},
 {id:'marketplace',name:'Compra on-line ou marketplace',alert:'Plataforma pode ser intermediadora; vendedor real e emissor da NF podem ser diferentes',conduct:'Confirmar vendedor, CNPJ emissor, NF em nome da escola e origem da mercadoria. Se interestadual, seguir a regra acima.',documents:'Pedido eletrônico, NF-e, XML e comprovante',responsible:'Comprador + Financeiro',payment:'Liberar somente com NF correta e análise fiscal quando aplicável',requiresReturn:false},
 {id:'patrimonio',name:'Bem durável / ativo imobilizado',alert:'Equipamento, mobiliário, máquina ou bem de uso prolongado',conduct:'Identificar como patrimônio e enviar à Contabilidade para classificação e registro.',documents:'NF-e, XML, pedido/ID, descrição do bem e setor de uso',responsible:'Administrativo/Patrimônio + Financeiro',payment:'Liberar após conferência e classificação indicada',requiresReturn:true},
 {id:'consumo',name:'Material para uso e consumo',alert:'Item será consumido na operação e não será revendido',conduct:'Informar a finalidade e o setor de uso; consultar a Contabilidade nas compras interestaduais.',documents:'NF-e, XML, pedido/ID e finalidade',responsible:'Administrativo + Financeiro',payment:'Liberar após conferência; interestadual depende de retorno',requiresReturn:false},
 {id:'repasse',name:'Mercadoria para revenda, kit ou repasse',alert:'Item será vendido, cobrado ou repassado a aluno/família',conduct:'Não tratar como uso e consumo. Informar previamente à Contabilidade para enquadramento fiscal.',documents:'NF-e, XML, pedido/ID e forma de repasse/venda',responsible:'Diretoria Adm. + Financeiro',payment:'Bloqueado até orientação da Contabilidade',requiresReturn:true},
 {id:'servico_pj',name:'Serviço contratado de pessoa jurídica',alert:'Pode haver retenções de ISS, INSS, IR, PIS, COFINS ou CSLL',conduct:'Enviar a NFS-e e o contrato/pedido à Contabilidade antes do pagamento; aguardar valores líquidos, guias e prazos.',documents:'NFS-e, contrato/proposta, pedido/ID e município do serviço',responsible:'Financeiro',payment:'Bloqueado até validação das retenções',requiresReturn:true},
 {id:'servico_pf',name:'Serviço prestado por autônomo/pessoa física',alert:'Pode exigir RPA, INSS, IR e obrigações acessórias',conduct:'Não pagar informalmente. Consultar RH/Financeiro e Contabilidade antes da contratação e do pagamento.',documents:'Dados do prestador, escopo, autorização e comprovantes exigidos',responsible:'RH + Financeiro',payment:'Bloqueado até formalização e cálculo',requiresReturn:true},
 {id:'frete',name:'Frete ou transporte contratado separadamente',alert:'Pode haver documento fiscal próprio e retenções',conduct:'Solicitar documento fiscal do transportador e encaminhar à Contabilidade antes do pagamento.',documents:'CT-e/NFS-e, contrato/pedido e vínculo com a compra',responsible:'Comprador + Financeiro',payment:'Bloqueado até conferência fiscal',requiresReturn:true},
 {id:'devolucao',name:'Nota de devolução, troca, cancelamento ou complemento',alert:'A NF original não corresponde ao que ficou definitivamente com a escola',conduct:'Não ajustar apenas na planilha. Solicitar documento fiscal correto e comunicar a Contabilidade.',documents:'NF original, documento de devolução/cancelamento/complemento e ocorrência',responsible:'Administrativo + Financeiro',payment:'Bloqueado até regularização documental',requiresReturn:true},
 {id:'reembolso',name:'Compra excepcional paga por colaborador',alert:'Risco de NF em CPF, ausência de autorização ou mistura de despesa pessoal',conduct:'Exigir autorização excepcional; sempre que possível, NF no CNPJ da escola; formalizar reembolso com comprovante.',documents:'NF, comprovante, autorização e formulário único',responsible:'Diretoria Adm. + Financeiro',payment:'Reembolso somente após conferência',requiresReturn:false},
 {id:'duvida',name:'Operação não prevista ou dúvida sobre o CNPJ',alert:'Natureza, finalidade, unidade compradora ou tratamento fiscal não estão claros',conduct:'Não concluir/pagar. Consultar Financeiro e Contabilidade; se houver futuros CNPJs, confirmar qual recebe, usa, contabiliza e paga.',documents:'Todos os documentos disponíveis e descrição da operação',responsible:'Diretoria Adm. + Financeiro',payment:'Bloqueado até orientação formal',requiresReturn:true}
];
const present=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>=5;
export function invoiceBlockers(n:BudgetInvoice):string[]{
 const errors:string[]=[];const scenario=fiscalMatrix.find(x=>x.id===n.scenario);const requiresReturn=fiscalMatrix.some(x=>(x.id===n.scenario||n.additionalScenarios?.includes(x.id))&&x.requiresReturn);
 for(const [key,label] of [['received','Recebimento/aceite'],['correctCnpj','Documento no CNPJ correto'],['xml','XML/documento equivalente']] as const){
  const c=n[key];if(c.status==='Sim')continue;
  if(c.status!=='N/A'){errors.push(`${label}: conferência pendente ou divergente.`);continue;}
  if(!present(c.reason)||!present(n.accountingReference))errors.push(`${label}: dispensa exige justificativa e orientação formal.`);
  if(key==='received'&&(!present(c.document)||!present(c.authorization)))errors.push('Adiantamento exige documento da condição e autorização administrativa/contábil; não registra recebimento.');
  if(key==='xml'&&!present(n.documentType))errors.push('Informe o tipo de documento que dispensa XML.');
 }
 if(!scenario)errors.push('Selecione o cenário fiscal.');
 if(!present(n.accountingReference)||!present(n.accountingResponsible))errors.push('Identifique a orientação formal e o responsável externo da Contabilidade.');
 if(n.accountingStatus!=='Validado'&&n.accountingStatus!=='Consulta não necessária')errors.push('Aguarde validação/liberação contábil.');
 if(n.accountingStatus==='Consulta não necessária'&&(!present(n.accountingReason)||requiresReturn))errors.push('Esta operação exige retorno contábil ou enquadramento formal justificado.');
 if(n.accountingStatus==='Validado'&&!n.sentToAccountingOn)errors.push('Registre o envio à Contabilidade.');
 if(!n.documents.length)errors.push('Vincule o documento fiscal ou a referência ao documento conferido.');
 return errors;
}
export function referenceMonth(r:Purchase):string|null {const m=r.management?.referenceMonth||r.form?.fields.referenceMonth;return typeof m==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m)?m:null;}
export const managementNumber=(r:Purchase,key:string):number|null=>{const v=r.management?.[key];return typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;};
export function validNeed(r:Purchase){return !!r.generalApproval&&!['rejected','deferred','correction','general_review','admin_review','estimating','pending'].includes(r.status);}
export type AmountSummary={total:number|null;known:number;missing:number};
export type MonthTotals=Record<'requested'|'recommended'|'approvedReference'|'contracted'|'realized',AmountSummary>;
export type BudgetTransfer={requestId:string;code:string;title:string;department:string;originalMonth:string;currentMonth:string;requested:number|null;latestRevision?:{at:string;actor:string;reason:string}};
export type MonthSummary={month:string;at:string;count:number;totals:MonthTotals;transfers:{incoming:BudgetTransfer[];outgoing:BudgetTransfer[]};differences:Record<'requestedToRecommended'|'referenceToContracted'|'contractedToRealized',AmountSummary>;emergencyRequested:AmountSummary;groups:Record<string,Record<string,{count:number;realized:AmountSummary}>>;indicators:Record<string,number>;rates:Record<'onTime'|'returned'|'quoteCovered',{count:number;total:number;percent:number|null}>;requestIds:string[];unclassified:number};
function sum(values:(number|null)[]):AmountSummary {const known=values.filter((v):v is number=>v!==null);return {total:known.length?Math.round(known.reduce((a,v)=>a+Math.round(v*100),0))/100:null,known:known.length,missing:values.length-known.length};}
export function monthSummary(requests:Purchase[],records:BudgetRecord[],month:string,settings:Settings,at:string):MonthSummary{
 const rs=requests.filter(r=>referenceMonth(r)===month),ns=records.filter((n):n is BudgetRecord&{kind:'budget_invoice'}=>n.kind==='budget_invoice'&&n.data.month===month);
 const movements:BudgetTransfer[]=[];
 for(const r of requests){
  const original=r.form?.fields.referenceMonth,current=referenceMonth(r);
  if(typeof original!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(original)||!current||original===current)continue;
  const revision=r.correctionHistory?.[r.correctionHistory.length-1];
  movements.push({requestId:r.id,code:r.code,title:r.title,department:r.department,originalMonth:original,currentMonth:current,requested:requestedTotal(r).total,...(revision?{latestRevision:{at:revision.at,actor:revision.actor,reason:revision.reason}}:{})});
 }
 const transfers={incoming:movements.filter(r=>r.currentMonth===month),outgoing:movements.filter(r=>r.originalMonth===month)};
 const total=(key:string)=>sum(rs.map(r=>managementNumber(r,key)));
 const difference=(before:(r:Purchase)=>number|null,after:(r:Purchase)=>number|null)=>sum(rs.map(r=>{const a=before(r),b=after(r);return a===null||b===null?null:Math.round((b-a)*100)/100;}));
 const cutoff=budgetCalendar(month,settings).find(x=>x.key==='submission')!.date;
 const onTime=rs.filter(r=>{const d=new Date(r.createdAt);return !Number.isNaN(d.getTime())&&new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(d)<=cutoff;}).length;
 const returned=rs.filter(r=>r.status==='correction'||!!r.returnForCorrection).length;
 const quoteCovered=rs.filter(r=>r.quotes.filter(q=>quoteComparable(q,r)&&q.validUntil>=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date(at))).length>=settings.minQuotes||!!r.management?.quotationException&&!!r.management?.quotationExceptionReason&&!!r.management?.quotationExceptionEvidence).length;
 const rate=(count:number)=>({count,total:rs.length,percent:rs.length?Math.round(count/rs.length*10000)/100:null});
 const groups:MonthSummary['groups']=Object.create(null);
 for(const key of ['department','classification','nature','priority','status']){groups[key]=Object.create(null);const buckets:Record<string,Purchase[]>=Object.create(null);for(const r of rs){const fields=r.form?.fields;const name=key==='classification'?String(fields?.classification||[fields?.origin,fields?.nature,fields?.budgetForecast].filter(Boolean).join(' · ')||'Não informado'):key==='nature'?String(fields?.nature||'Não informado'):String(r[key as 'department'|'priority'|'status']);(buckets[name]||=[]).push(r);}for(const [name,bucket] of Object.entries(buckets))groups[key][name]={count:bucket.length,realized:sum(bucket.map(r=>managementNumber(r,'realizedAmount')))};}
 return {month,at,count:rs.length,transfers,unclassified:requests.filter(r=>!referenceMonth(r)).length,requestIds:rs.map(r=>r.id),groups,rates:{onTime:rate(onTime),returned:rate(returned),quoteCovered:rate(quoteCovered)},emergencyRequested:sum(rs.filter(r=>r.form?.kind==='emergency').map(r=>requestedTotal(r).total)),differences:{requestedToRecommended:difference(r=>requestedTotal(r).total,r=>managementNumber(r,'recommendedAmount')),referenceToContracted:difference(r=>r.estimate?.total??null,r=>managementNumber(r,'contractedAmount')),contractedToRealized:difference(r=>managementNumber(r,'contractedAmount'),r=>managementNumber(r,'realizedAmount'))},totals:{requested:sum(rs.map(r=>requestedTotal(r).total)),recommended:total('recommendedAmount'),approvedReference:sum(rs.filter(validNeed).map(r=>r.estimate?.total??null)),contracted:total('contractedAmount'),realized:total('realizedAmount')},indicators:{emergency:rs.filter(r=>r.form?.kind==='emergency').length,returned,deferred:rs.filter(r=>r.status==='deferred').length,rejected:rs.filter(r=>r.status==='rejected').length,missingReview:rs.filter(r=>!r.adminReview).length,missingDecision:rs.filter(r=>!r.generalApproval&&!['rejected','deferred'].includes(r.status)).length,missingDocuments:rs.filter(r=>!ns.some(n=>n.data.requestId===r.id&&n.data.documents.length>0)).length,missingClosure:rs.filter(r=>r.status!=='received'&&r.status!=='rejected').length,quoteCovered,onTime,deliveryOnTime:rs.filter(r=>r.status==='received'&&typeof r.management?.receiptDate==='string'&&r.management.receiptDate<=r.neededBy).length,fiscalPending:ns.filter(n=>n.data.paymentStatus!=='Cancelado'&&(!n.data.released||invoiceBlockers(n.data).length>0)).length}};
}
function dateOf(y:number,m:number,d:number){return new Date(Date.UTC(y,m,d));}
const iso=(d:Date)=>d.toISOString().slice(0,10);
function business(d:Date,holidays:string[]){return ![0,6].includes(d.getUTCDay())&&!holidays.includes(iso(d));}
export function budgetCalendar(month:string,settings:Settings){
 const [y,m]=month.split('-').map(Number),holidays=settings.holidays||[];
 const fixed=[['submission','Envio',15],['check','Conferência',18],['complement','Complementação',20],['review','Parecer',22],['financial','Financeiro',23],['decision','Decisão da necessidade',25],['communication','Comunicação',27]] as const;
 const result: {key:string;label:string;date:string}[]=fixed.map(([key,label,day])=>{const d=dateOf(y,m-2,day);while(!business(d,holidays))d.setUTCDate(d.getUTCDate()-1);return {key,label,date:iso(d)};});
 result.push({key:'execution',label:'Execução a partir de',date:iso(dateOf(y,m-1,1))});const report=dateOf(y,m,0);let days=0;while(days<5){report.setUTCDate(report.getUTCDate()+1);if(business(report,holidays))days++;}result.push({key:'report',label:'Relatório até',date:iso(report)});return result;
}
export function closingBlockers(requests:Purchase[],records:BudgetRecord[],c:BudgetClosing,at:string):string[]{
 const errors:string[]=[];const rs=requests.filter(r=>referenceMonth(r)===c.month);const ns=records.filter((n):n is BudgetRecord&{kind:'budget_invoice'}=>n.kind==='budget_invoice'&&n.data.month===c.month);
 for(const r of rs){const m=r.management||{},contracted=managementNumber(r,'contractedAmount'),realized=managementNumber(r,'realizedAmount');
  if((contracted!==null||realized!==null)&&!validNeed(r))errors.push(`${r.code}: execução/contratação sem aprovação válida da necessidade.`);
  if(((contracted!==null&&r.estimate&&contracted!==r.estimate.total)||(realized!==null&&((contracted!==null&&realized!==contracted)||(r.estimate&&realized!==r.estimate.total))))&&!present(m.differenceReason))errors.push(`${r.code}: explique a diferença financeira.`);
  if(r.status==='received'&&(m.receiptStatus!=='Recebido e aceito'||!m.financeForwardedAt))errors.push(`${r.code}: encerramento exige aceite e encaminhamento financeiro.`);
  if(!r.archived&&!['received','rejected'].includes(r.status)){
   const f=c.followups.find(f=>f.requestId===r.id&&!f.invoiceId);
   if(!f)errors.push(`${r.code}: registre encaminhamento com responsável, próxima ação, valor/saldo a confirmar e prazo.`);
  }
 }
 for(const n of ns){if(n.data.paymentStatus==='Pago'&&!requests.some(r=>r.id===n.data.requestId&&validNeed(r)))errors.push(`NF ${n.data.number}: pagamento sem aprovação válida da necessidade.`);if(n.data.paymentStatus==='Pago'&&(!n.data.released||invoiceBlockers(n.data).length))errors.push(`NF ${n.data.number}: pagamento sem liberação/documentação válida.`);
  if(!['Pago','Cancelado'].includes(n.data.paymentStatus)&&!c.followups.some(f=>f.invoiceId===n.id))errors.push(`NF ${n.data.number}: pagamento pendente exige acompanhamento explícito com prazo e responsável.`);
 }
 for(const f of c.followups){if(!rs.some(r=>r.id===f.requestId)&&!requests.some(r=>r.id===f.requestId))errors.push('Acompanhamento sem solicitação válida.');if(f.invoiceId&&!ns.some(n=>n.id===f.invoiceId&&n.data.requestId===f.requestId))errors.push('Acompanhamento com nota fiscal inválida.');if(!present(f.owner)||!present(f.nextAction)||!present(f.reason)||!f.deadline)errors.push('Acompanhamento incompleto.');}
 return errors;
}
