import type {AgendaEntry} from './contact-model';
export type QuotationContactSelection =
 | {kind:'saved';id:string;version:number;phone:string}
 | {kind:'sync';syncId:string;phone:string};
export type QuotationContactChoice = {
 key:string;selection:QuotationContactSelection;name:string;phone:string;company?:string;category?:string;
 scope?:'local'|'national';classification:AgendaEntry['classification'];sourceLabel:string;
 recommended:boolean;itemIndexes:number[];disabledReason?:string;
};
export type QuotationContactsSnapshot = {requestId:string;requestVersion:number;choices:QuotationContactChoice[]};
