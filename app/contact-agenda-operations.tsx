import type {AgendaEntry,ContactDraft,ContactImportResult} from './contact-model';
export type ImportProgress = {processed:number;created:number;existing:number;conflicts:number;error?:string};
const message=(error:unknown)=>error instanceof Error?error.message:'Não foi possível concluir a operação.';
export async function importContactBatches<T>(contacts:T[],send:(batch:T[])=>Promise<ContactImportResult>,progress:(count:number)=>void,confirmed:(batch:T[],result:ContactImportResult)=>void):Promise<ImportProgress>{
 const result:ImportProgress={processed:0,created:0,existing:0,conflicts:0};progress(0);
 for(let index=0;index<contacts.length;index+=50){const batch=contacts.slice(index,index+50);try{const saved=await send(batch);result.processed+=batch.length;result.created+=saved.created;result.existing+=saved.existing;result.conflicts+=saved.conflicts;confirmed(batch,saved);progress(result.processed)}catch(error){result.error=message(error);break}}
 return result;
}
export type Classification = {classification:AgendaEntry['classification'];category?:string;scope?:'local'|'national'};
export async function classifyContactEntries(entries:AgendaEntry[],choice:Classification,send:(payload:unknown)=>Promise<unknown>,progress:(count:number)=>void):Promise<{saved:number;error?:string}>{
 let saved=0;progress(0);
 for(const entry of entries){try{await send({action:'save',id:entry.id,version:entry.version,classification:choice.classification,data:{name:entry.name,phone:entry.phone,company:entry.company,email:entry.email,contact:entry.contact,city:entry.city,state:entry.state,category:choice.category||entry.category,scope:choice.scope||entry.scope}});progress(++saved)}catch(error){return {saved,error:entry.name+': '+message(error)}}}
 return {saved};
}
const searchable=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterContactEntries(entries:AgendaEntry[],filters:{query:string;classification:string;scope:string}):AgendaEntry[]{
 const query=searchable(filters.query.trim());const phoneQuery=query.replace(/\D/g,'');
 return entries.filter(entry=>(filters.classification==='all'||entry.classification===filters.classification)&&(filters.scope==='all'||entry.scope===filters.scope)&&(searchable([entry.name,entry.company,entry.phone,entry.category].filter(Boolean).join(' ')).includes(query)||(phoneQuery.length>2&&entry.phone.replace(/\D/g,'').includes(phoneQuery))));
}
export function contactDraft(entry:ContactDraft):ContactDraft{return {name:entry.name,phone:entry.phone,company:entry.company,email:entry.email,category:entry.category,city:entry.city,state:entry.state}}
