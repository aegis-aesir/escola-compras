import type {Item} from './model';
import type {SavedEstimateCriteria} from './estimate-criteria';
export type SearchSource = {title:string;url:string;description:string};
export type IntegrationJob = {
  id:string;version:number;requestId:string;type:'estimate_search'|'local_supplier_search'|'national_search'|'whatsapp_quote';
  state:'queued'|'running'|'review'|'done'|'failed'|'uncertain'|'blocked'|'cancelled';
  createdAt:string;updatedAt:string;attempts:number;nextAttemptAt:string;
  estimateRevision?:string;item?:Item;researchItem?:Item;researchCriteria?:SavedEstimateCriteria;browserResearch?:{state:'ready'|'login_required'|'unverified'|'unavailable';detail:string;profile:'compras';checkedAt:string};analysisReason?:string;priceEvidence?:{url:string;title:string;text:string;origin?:'public'|'authenticated_browser';analysis?:unknown};itemIndex?:number;query?:string;category?:string;supplierId?:string;supplierName?:string;target?:string;
  accountId?:string;schoolPhone?:string;message?:string;sources?:SearchSource[];
  quotationTemplate?:{version:'contact-v1';text:string;contact:string};
  contactId?:string;manualSelection?:{recipientId:string;actor:string;at:string;suggested:boolean};
  testSend?:{version:number;issuedAt:string;expiresAt:string};
  messageHistory?:{message?:string;quotationTemplate?:IntegrationJob['quotationTemplate'];at:string;reason:string}[];
  cancellation?:{actor:string;at:string;reason:string;previousState:IntegrationJob['state']};
  removed?:{at:string;by:string;reason:string};
  removalHistory?:{action:'remove'|'restore';at:string;by:string;reason:string}[];
  preparationId?:string;resendOf?:{id:string;version:number};
  researchedAt?:string;providerMessageId?:string;sentAt?:string;error?:string;
  leaseToken?:string;leaseUntil?:string;
};
export type InboxMessage = {
  id:string;version:number;messageId:string;accountId:string;from:string;to:string;
  text:string;receivedAt:string;recordedAt:string;requestId?:string;supplierId?:string;
  contactId?:string;contactName?:string;
  state:'review'|'reviewed';note?:string;reviewedBy?:string;reviewedAt?:string;
};
export type IntegrationSnapshot = {
  provider:'OpenClaw';accountId:string;schoolPhone:string;bridgeConfigured:boolean;
  sendingEnabled:boolean;lastSeenAt?:string;jobs:IntegrationJob[];inbox:InboxMessage[];
};
export const jobLabels:Record<IntegrationJob['state'],string> = {
  queued:'Na fila',running:'Em processamento',review:'Conferir resultado',done:'Concluído',
  failed:'Falha — pode tentar novamente',uncertain:'Envio incerto — conferir no WhatsApp',
  blocked:'Envio desativado',cancelled:'Cancelado',
};
export function canCancelQuotationJob(j:IntegrationJob){
  return j.type==='whatsapp_quote'&&!j.removed&&['blocked','queued','failed'].includes(j.state)&&j.attempts===0&&j.sentAt===undefined&&j.providerMessageId===undefined&&j.leaseToken===undefined&&j.leaseUntil===undefined&&j.testSend===undefined;
}
export function canRemoveQuotationJob(j:IntegrationJob){
 if(j.type!=='whatsapp_quote'||j.removed)return false;
 if(j.state==='done')return j.attempts>=1&&!!j.sentAt&&!!j.providerMessageId;
 return ['blocked','queued','failed','cancelled'].includes(j.state)&&j.attempts===0&&j.sentAt===undefined&&j.providerMessageId===undefined&&j.leaseToken===undefined&&j.leaseUntil===undefined&&j.testSend===undefined;
}
export function hasAmbiguousQuotation(j:IntegrationJob){
 if(j.state==='uncertain')return true;
 if(j.state==='done')return !j.sentAt||!j.providerMessageId||!(j.attempts>=1);
 if(['failed','blocked','queued','cancelled'].includes(j.state))return j.attempts!==0||j.sentAt!==undefined||j.providerMessageId!==undefined||j.leaseToken!==undefined||j.leaseUntil!==undefined||j.testSend!==undefined;
 return false;
}
