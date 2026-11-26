import type {Purchase} from './model';
import type {IntegrationJob} from './integration-model';
import {isCurrentEstimateJob} from './estimate-criteria';
import {classifyEvidence} from '../integrations/openclaw/price-evidence.mjs';

export function estimateProgress(request:Purchase,jobs:IntegrationJob[]=[]){
 const items=request.items.map((item,itemIndex)=>{
  const job=jobs.filter(j=>j.itemIndex===itemIndex&&j.state!=='cancelled'&&isCurrentEstimateJob(request,j)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
  const evidence=request.form?.kind!=='digital'&&job?.state==='review'&&job.priceEvidence&&job.researchedAt?classifyEvidence(item,job.priceEvidence):null;
  // Ticket 05: valor a conferir também é exibido (e somado), com o motivo; só o comprovado conta como validado.
  const reference=evidence&&evidence.outcome!=='pending'?{unitPrice:evidence.unitPrice}:null,toCheck=evidence?.outcome==='to_check'?evidence.reason:undefined;
  return {item,job,reference,toCheck,subtotal:reference?Math.round(reference.unitPrice*item.quantity*100)/100:undefined};
 });
 const verified=items.filter(item=>item.reference&&!item.toCheck).length;
 const working=items.some(({job})=>!job||['queued','running'].includes(job.state));
 return {items,verified,working,partialTotal:Math.round(items.reduce((sum,item)=>sum+(item.subtotal||0),0)*100)/100};
}
