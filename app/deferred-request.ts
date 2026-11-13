import {requestDraftSchema,type RequestDraftValues} from './request-draft';
import type {Member,Purchase} from './model';
import {requestSchema} from './model';
import {parseBudgetForm,budgetMonth,submissionMonth} from './budget';
import {deferredDraftRecord} from './deferred-draft';
import {FlowError} from './workflow';
import {z} from 'zod';

export function deferredValues(request:Purchase){return request.deferredEdit?.values||deferredDraftRecord(request,request.id,request.updatedAt).values}
export function beginDeferredRevision(request:Purchase,actor:string,now:string){
 const values=deferredDraftRecord(request,request.id,now);
 return {deferred:{...request.deferred!,availableMonth:values.availableMonth},deferredEdit:{values:values.values,actor,updatedAt:now}};
}
export function canEditDeferred(request:Purchase,me:{id:string;role:Member['role']}){return !request.archived&&request.status==='deferred'&&(me.role==='admin'||me.role==='solicitante'&&request.authorId===me.id||me.role==='administrativo'&&request.authorId===me.id)}
export function reapplyDeferredRequest(old:Purchase,input:unknown,me:{id:string;role:Member['role'];name:string},now:string,reason?:unknown){
 if(!canEditDeferred(old,me))throw new FlowError('Seu perfil não permite reapresentar esta solicitação adiada.',403);
 const month=submissionMonth(now),available=old.deferred?.availableMonth||deferredDraftRecord(old,old.id,now).availableMonth;
 if(me.role!=='admin'&&month<available)throw new FlowError(`Esta solicitação poderá ser reapresentada a partir de ${available.split('-').reverse().join('/')}.`,409);
 const justification=me.role==='admin'?z.string().trim().min(5,'Informe o motivo da reapresentação pelo Master.').max(2000).parse(reason):'Reapresentação pelo setor solicitante';
 const parsed=requestSchema.parse(input),form=parseBudgetForm((input as {form?:unknown})?.form,parsed.items,{at:now});
 // Competência antiga pertence ao snapshot; a rodada atual tem a competência deste envio.
 form.fields.referenceMonth=month;
 const previous={...old};delete previous.roundHistory;
 const data:Purchase={...old,...parsed,department:old.department,status:'pending',form,formDeclared:{actor:me.name,at:now},priority:form.kind==='emergency'?'Emergencial':form.fields.requestPriority as Purchase['priority'],updatedAt:now,roundSubmittedAt:now,estimateRevision:crypto.randomUUID(),roundHistory:[...(old.roundHistory||[]),{at:now,actor:me.name,reason:justification,month:budgetMonth(old)||'',previous}],quotes:[],quoteHistory:[...(old.quoteHistory||[]),...old.quotes]};
 for(const key of ['deferred','deferredEdit','estimate','estimateCriteria','management','adminReview','generalApproval','needDecision','decision','selectedQuoteId','returnForCorrection','generalReturn','originalScope','localStartedAt','localDeadline','localAttempts','executionNotes','nationalReason'] as const)delete data[key];
 return data;
}

export function deferredBackupRecovery(remote:{version:number;values:RequestDraftValues;closed?:boolean},input:unknown):{automatic?:RequestDraftValues;review?:RequestDraftValues}{
 if(remote.closed||!input||typeof input!=='object')return {};
 const local=input as {version?:unknown;values?:unknown},parsed=requestDraftSchema.safeParse(local.values);
 if(!parsed.success||JSON.stringify(parsed.data)===JSON.stringify(remote.values))return {};
 return local.version===remote.version?{automatic:parsed.data}:{review:parsed.data};
}
