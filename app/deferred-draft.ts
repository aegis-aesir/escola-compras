import {budgetMonth,submissionMonth} from './budget';
import type {Purchase} from './model';
import type {DeferredDraftMetadata,DeferredDraftRecord,RequestDraftValues} from './request-draft';

const nextMonth=(month:string)=>{const [year,value]=month.split('-').map(Number);return value===12?`${year+1}-01`:`${year}-${String(value+1).padStart(2,'0')}`};

export function deferredDraftRecord(request:Purchase,draftId:string,now:string):DeferredDraftRecord{
  const source=request.originalScope||request,form=source.form||request.form;
  const fields={...(form?.fields||{})};
  for(const key of ['referenceMonth','situation','originalRequestId','correctionResponse'])delete fields[key];
  const items=(source.items||request.items).map(item=>({...item,subscription:item.subscription?{...item.subscription}:undefined}));
  const values:RequestDraftValues={
    title:request.title,department:request.department,neededBy:request.neededBy,reason:request.reason,
    kind:form?.kind||'monthly',fields,items,
    references:(form?.references||[]).map(reference=>({...reference})),
    subscriptionPrices:Object.fromEntries(items.flatMap((item,index)=>item.subscription?[[String(index),String(item.subscription.pricePerCycle)]]:[])),
  };
  const effective=budgetMonth(request),availableMonth=effective?nextMonth(effective):submissionMonth(now);
  return {id:draftId,authorId:request.authorId,status:'deferred',sourceRequestId:request.id,sourceCode:request.code,deferReason:request.deferred?.reason||'',availableMonth,deferredAt:request.deferred?.at||now,values,updatedAt:now};
}

export function canSubmitDeferredDraft(metadata:Pick<DeferredDraftMetadata,'availableMonth'>,now:string):boolean{
  return submissionMonth(now)>=metadata.availableMonth;
}
