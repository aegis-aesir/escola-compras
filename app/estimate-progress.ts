import type {Purchase} from './model';
import type {IntegrationJob} from './integration-model';
import {extractReference} from '../integrations/openclaw/price-evidence.mjs';

export function estimateProgress(request:Purchase,jobs:IntegrationJob[]=[]){
 const items=request.items.map((item,itemIndex)=>{
  const job=jobs.filter(j=>j.requestId===request.id&&j.type==='estimate_search'&&j.itemIndex===itemIndex&&j.state!=='cancelled'&&(j.estimateRevision||'')===(request.estimateRevision||'')&&JSON.stringify(j.item)===JSON.stringify(item)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
  const reference=request.form?.kind!=='digital'&&job?.state==='review'&&job.priceEvidence&&job.researchedAt?extractReference(item,job.priceEvidence):null;
  return {item,job,reference,subtotal:reference?Math.round(reference.unitPrice*item.quantity*100)/100:undefined};
 });
 const verified=items.filter(item=>item.reference).length;
 const working=items.some(({job})=>!job||['queued','running'].includes(job.state));
 return {items,verified,working,partialTotal:Math.round(items.reduce((sum,item)=>sum+(item.subtotal||0),0)*100)/100};
}
