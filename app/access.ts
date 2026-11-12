import type { Member, Purchase } from './model';
import {allowedViewsForRole} from './process-navigation';
export const roleLabels:Record<Member['role'],string>={admin:'Master',administrativo:'Diretoria Administrativa',geral:'Diretoria Geral',solicitante:'Setor',financeiro:'Financeiro'};
export function visibleViews(role:Member['role']) {
  return allowedViewsForRole(role);
}
export const canCreateRequest=(role:Member['role'])=>['admin','administrativo','solicitante'].includes(role);
export const canFinanceReadRequest=(request:Pick<Purchase,'generalApproval'>)=>!!request.generalApproval;
export const canReadBudgetRecords=(role:Member['role'])=>['admin','administrativo','financeiro','geral'].includes(role);
export function visibleRequests(requests:Purchase[],me:{id:string;role:Member['role']}):Purchase[] {
  if(me.role==='admin'||me.role==='administrativo')return requests;
  if(me.role==='financeiro')return requests.filter(canFinanceReadRequest);
  return requests.filter(r=>me.role==='solicitante'?r.authorId===me.id:!r.archived).map(r=>({
    id:r.id,version:r.version,code:r.code,title:r.title,authorId:r.authorId,authorName:r.authorName,
    department:r.department,priority:r.priority,neededBy:r.neededBy,reason:r.reason,items:r.items,
    reopeningHistory:r.reopeningHistory?.map(({at,actor,reason,previous})=>({at,actor,reason,previous:{decision:previous.decision,needDecision:previous.needDecision}})),
    archived:r.archived,archiveHistory:r.archiveHistory,createdAt:r.createdAt,updatedAt:r.updatedAt,status:r.status,quotes:[],effectiveReferenceMonth:typeof r.management?.referenceMonth==='string'?r.management.referenceMonth:undefined,form:r.form,formDeclared:r.formDeclared,returnForCorrection:r.returnForCorrection,needDecision:r.needDecision,deferred:r.deferred,originalScope:r.originalScope?{items:r.originalScope.items,form:r.originalScope.form}:undefined,
    ...(me.role==='geral'?{estimate:r.estimate,adminReview:r.adminReview,generalApproval:r.generalApproval,management:generalContext(r.management),generalReturnHistory:r.generalReturnHistory,reportingQuotes:generalReportingQuotes(r.quotes)}:{}),
  }));
}

function generalContext(m:Purchase['management']){if(!m)return undefined;const allowed=['quantityAssessment','additionalDataStatus',...Object.keys(m).filter(key=>/^recommendedQuantity_\d+$/.test(key)),'recommendation','validatedPriority','technicalReview','validatedEmergency','referenceMonth','contractedAmount','realizedAmount','receiptDate','quotationException','quotationExceptionReason','quotationExceptionEvidence'];return Object.fromEntries(allowed.filter(k=>m[k]!==undefined).map(k=>[k,m[k]]));}
function generalReportingQuotes(quotes:Purchase['quotes']):NonNullable<Purchase['reportingQuotes']>{return quotes.map(q=>({validUntil:q.validUntil,total:typeof q.total==='number'?0:null,comparisonReady:q.comparisonReady,comparable:q.comparable,...(q.archived?{archived:q.archived}:{})}));}
