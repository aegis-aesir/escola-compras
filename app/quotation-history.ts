import type {IntegrationJob} from './integration-model';
export type SentQuotation={id:string;version:number;sentAt:string};
export function lastSentQuotation(jobs:IntegrationJob[],requestId:string,target:string):SentQuotation|undefined{
 const all=jobs.filter(j=>j.type==='whatsapp_quote'&&j.requestId===requestId&&j.target===target&&j.state==='done'&&j.sentAt&&j.providerMessageId);
 const superseded=new Set(all.map(j=>j.resendOf?.id).filter(Boolean)),current=all.filter(j=>!superseded.has(j.id));
 const sent=(current.length?current:all).sort((a,b)=>b.sentAt!.localeCompare(a.sentAt!)||b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))[0];
 return sent?{id:sent.id,version:sent.version,sentAt:sent.sentAt!}:undefined;
}
