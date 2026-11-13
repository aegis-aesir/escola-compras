import {z} from 'zod';
import type {Item,Purchase} from './model';
import type {IntegrationJob} from './integration-model';

export const estimateCriteriaSchema=z.object({
 searchName:z.string().trim().min(2).max(300),
 minimumRequirements:z.string().trim().min(3,'Informe os requisitos mínimos.').max(2000),
 allowSimilar:z.boolean(),brandPolicy:z.enum(['required','reference']),brandModel:z.string().trim().max(300),
}).strict();
export type EstimateCriteria=z.infer<typeof estimateCriteriaSchema>;
export type SavedEstimateCriteria=EstimateCriteria&{revision:string;actor:string;at:string;sourceItem:Item};
export function defaultEstimateCriteria(item:Item):EstimateCriteria{
 return {searchName:item.name,minimumRequirements:item.spec||item.name,allowSimilar:false,brandPolicy:item.brand?'required':'reference',brandModel:item.brand||''};
}
export function savedItemCriteria(request:Pick<Purchase,'items'|'estimateCriteria'>,index:number){
 const saved=request.estimateCriteria?.[index];
 return saved&&JSON.stringify(saved.sourceItem)===JSON.stringify(request.items[index])?saved:undefined;
}
export function itemResearchTarget(item:Item,criteria?:EstimateCriteria):Item{
 if(!criteria)return item;
 const brand=criteria.brandPolicy==='required'?criteria.brandModel:undefined;
 return {...item,name:criteria.allowSimilar?criteria.searchName:item.name,brand:criteria.allowSimilar?brand:item.brand,spec:[criteria.allowSimilar?'':item.spec,criteria.minimumRequirements,brand?`Marca/modelo obrigatório: ${brand}`:''].filter(Boolean).join('\n')};
}
export function isCurrentEstimateJob(request:Pick<Purchase,'id'|'items'|'estimateRevision'|'estimateCriteria'>,job:IntegrationJob){
 const index=job.itemIndex??0;
 return job.requestId===request.id&&job.type==='estimate_search'&&(job.estimateRevision||'')===(request.estimateRevision||'')&&JSON.stringify(job.item)===JSON.stringify(request.items[index])&&(job.researchCriteria?.revision||'')===(savedItemCriteria(request,index)?.revision||'');
}
