export type ContactDraft = {
 name:string;phone:string;company?:string;email?:string;category?:string;city?:string;state?:string;
};
export type ContactSource = {kind:'manual'|'csv'|'vcf'|'whatsapp';label:string;at:string;actor:string};
export type AgendaEntry = ContactDraft & {
 id:string;version:number;kind:'supplier'|'agenda_contact';classification:'unclassified'|'general'|'supplier';
 contact?:string;scope?:'local'|'national';source?:ContactSource;
 removed?:{at:string;by:string;reason:string};
};
export type ContactParseResult = {contacts:ContactDraft[];issues:{line:number;message:string}[];duplicates:number;total:number};
export type ContactSyncView = {
 syncId:string;state:'queued'|'running'|'review'|'failed';requestedAt:string;requestedBy:string;updatedAt:string;
 contacts:ContactDraft[];coverage:'known_conversations';error?:string;counts?:{candidates:number;skipped:number};
 warnings?:{source:'ingress'|'session_metadata';error:'source_unavailable'|'schema_unsupported'|'limit_exceeded'|'read_failed'}[];
};
export type ContactsSnapshot = {entries:AgendaEntry[];removedEntries?:AgendaEntry[];sync?:ContactSyncView;bridgeReady:boolean};
export type ContactImportResult = {created:number;existing:number;conflicts:number;results:{index:number;id:string;status:'created'|'existing'|'conflict'}[]};
