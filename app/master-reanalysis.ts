import {z} from 'zod';
import type {Purchase,Member} from './model';
import {FlowError} from './workflow';
import {isAwaitingAdministrativeAnalysis} from './request-views';

export function masterReanalysis(old:Purchase,reason:unknown,me:{role:Member['role'];name:string},now:string){
 if(me.role!=='admin')throw new FlowError('Somente o Master pode reenviar para análise administrativa.',403);
 if(isAwaitingAdministrativeAnalysis(old))throw new FlowError('Esta solicitação já está em Análise ADM.',409);
 const justification=z.string().trim().min(5).max(2000).parse(reason);
 const previous={...old};delete previous.reanalysisHistory;
 const reanalysisHistory=old.reanalysisHistory;
 const data:Purchase={...old,status:old.estimate?'admin_review':'pending',updatedAt:now,reanalysisHistory:[...(reanalysisHistory||[]),{actor:me.name,at:now,reason:justification,previous}],management:{...(old.management?.referenceMonth?{referenceMonth:old.management.referenceMonth}:{}),validatedPriority:old.priority}};
 for(const key of ['generalApproval','adminReview','needDecision','decision','selectedQuoteId','returnForCorrection','generalReturn','deferred','deferredEdit','archived','localStartedAt','localDeadline','localAttempts','executionNotes','nationalReason'] as const)delete data[key];
 data.quoteHistory=[...(old.quoteHistory||[]),...old.quotes];data.quotes=[];
 if(old.archived)data.archiveHistory=[...(old.archiveHistory||[]),{action:'restore',actor:me.name,at:now,reason:justification}];
 if(!old.estimate)data.estimateRevision=now;
 return {data,action:'Master reenviou para nova análise administrativa; decisões anteriores preservadas no histórico: '+justification};
}
