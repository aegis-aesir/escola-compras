import type {Item} from './model';
export type SearchSource = {title:string;url:string;description:string};
export type IntegrationJob = {
  id:string;version:number;requestId:string;type:'estimate_search'|'local_supplier_search'|'national_search'|'whatsapp_quote';
  state:'queued'|'running'|'review'|'done'|'failed'|'uncertain'|'blocked'|'cancelled';
  createdAt:string;updatedAt:string;attempts:number;nextAttemptAt:string;
  estimateRevision?:string;item?:Item;browserResearch?:{state:'ready'|'login_required'|'unverified'|'unavailable';detail:string;profile:'compras';checkedAt:string};analysisReason?:string;priceEvidence?:{url:string;title:string;text:string;origin?:'public'|'authenticated_browser';analysis?:unknown};itemIndex?:number;query?:string;category?:string;supplierId?:string;supplierName?:string;target?:string;
  accountId?:string;schoolPhone?:string;message?:string;sources?:SearchSource[];
  researchedAt?:string;providerMessageId?:string;sentAt?:string;error?:string;
  leaseToken?:string;leaseUntil?:string;
};
export type InboxMessage = {
  id:string;version:number;messageId:string;accountId:string;from:string;to:string;
  text:string;receivedAt:string;recordedAt:string;requestId?:string;supplierId?:string;
  state:'review'|'reviewed';note?:string;reviewedBy?:string;reviewedAt?:string;
};
export type IntegrationSnapshot = {
  provider:'OpenClaw';accountId:string;schoolPhone:string;bridgeConfigured:boolean;
  sendingEnabled:boolean;lastSeenAt?:string;jobs:IntegrationJob[];inbox:InboxMessage[];
};
export const jobLabels:Record<IntegrationJob['state'],string> = {
  queued:'Na fila',running:'Em processamento',review:'Conferir resultado',done:'Concluído',
  failed:'Falha — pode tentar novamente',uncertain:'Envio incerto — conferir no WhatsApp',
  blocked:'Envio desativado',cancelled:'Cancelado pela etapa do pedido',
};
