import {z} from 'zod';
// Drafts intentionally accept incomplete form fields, but bound their shape and size.
const text=z.string().max(5000);
export const requestDraftSchema=z.object({
 title:text,department:text,neededBy:text,reason:text,
 kind:z.enum(['monthly','emergency','digital']),
 fields:z.record(z.union([text,z.number().finite(),z.boolean()])),
 items:z.array(z.object({name:text,quantity:z.number().finite(),unit:text,spec:text,category:text.optional(),brand:text.optional(),estimatedUnitPrice:z.number().finite().optional(),subscription:z.object({plan:text,cycle:z.enum(['Mensal','Anual','Outro']),start:text,end:text,cycles:z.number().finite(),currency:z.enum(['BRL','USD','EUR','Outra']),pricePerCycle:z.number().finite(),exchangeRate:z.number().finite().optional(),exchangeDate:text.optional()}).optional()})).min(1).max(50),
 references:z.array(z.object({itemIndex:z.number().int(),supplier:text,currency:text,reference:text,condition:text.optional(),amount:z.number().finite().optional(),deadline:text.optional(),validUntil:text.optional()})).max(100),
 subscriptionPrices:z.record(text),
});
export type RequestDraftValues=z.infer<typeof requestDraftSchema>;
export type DeferredDraftMetadata={status:'deferred';sourceRequestId:string;sourceCode:string;deferReason:string;availableMonth:string;deferredAt:string};
export type RequestDraft={id:string;version:number;values:RequestDraftValues;updatedAt:string;status?:'draft'|'deferred';sourceRequestId?:string;sourceCode?:string;deferReason?:string;availableMonth?:string;deferredAt?:string};
export type DeferredDraftRecord=DeferredDraftMetadata&{id:string;authorId:string;values:RequestDraftValues;updatedAt:string};
