import type {AgendaEntry,ContactSyncView} from './contact-model';
import type {Purchase,Supplier} from './model';
import type {QuotationContactChoice} from './quotation-contact-model';
import {compatibleQuotationSuppliers} from './supplier-discovery';
import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';

const schoolPhone='+559292017107';
const available=(phone:string|undefined)=>!phone?'Telefone inválido':phone===schoolPhone?'Número da própria escola':!/^\+[1-9]\d{9,14}$/.test(phone)?'Telefone incompatível com o envio pelo WhatsApp':undefined;

/** Projeta referências verificáveis sem alterar os cadastros ou classificar contatos. */
export function buildQuotationContactChoices(request:Purchase,entries:AgendaEntry[],sync?:ContactSyncView):QuotationContactChoice[]{
 const suppliers=entries.filter(entry=>entry.kind==='supplier'&&entry.classification==='supplier'&&entry.category?.trim()&&entry.scope).map(entry=>({...entry,contact:entry.contact||'',category:entry.category!,scope:entry.scope!})) as Supplier[];
 const matches=new Map(compatibleQuotationSuppliers(request,suppliers).map(match=>[match.supplier.id,match.itemIndexes]));
 const choices=new Map<string,QuotationContactChoice>();
 // Um fornecedor salvo prevalece sobre contatos gerais com o mesmo telefone.
 const sorted=[...entries].sort((a,b)=>Number(b.kind==='supplier')-Number(a.kind==='supplier'));
 for(const entry of sorted){
  const normalized=normalizeContactPhone(entry.phone),phone=normalized||entry.phone;
  const dedupe=normalized||`invalid:${entry.id}`;
  if(choices.has(dedupe))continue;
  const disabledReason=available(normalized),itemIndexes=matches.get(entry.id)||[];
  choices.set(dedupe,{
   key:`saved:${entry.id}:${entry.version}:${phone}`,selection:{kind:'saved',id:entry.id,version:entry.version,phone},
   name:entry.name,phone,company:entry.company,category:entry.category,scope:entry.scope,classification:entry.classification,
   sourceLabel:entry.kind==='supplier'?'Fornecedor · agenda':'Contato · agenda',recommended:!disabledReason&&itemIndexes.length>0,itemIndexes,disabledReason,
  });
 }
 if(sync?.state==='review')for(const [index,contact] of sync.contacts.entries()){
  const normalized=normalizeContactPhone(contact.phone),phone=normalized||contact.phone,dedupe=normalized||`sync-invalid:${index}`;
  if(choices.has(dedupe))continue;
  choices.set(dedupe,{
   key:`sync:${sync.syncId}:${phone}`,selection:{kind:'sync',syncId:sync.syncId,phone},name:contact.name,phone,company:contact.company,
   classification:'unclassified',sourceLabel:'WhatsApp · prévia',recommended:false,itemIndexes:[],disabledReason:available(normalized),
  });
 }
 return [...choices.values()].sort((a,b)=>Number(b.recommended)-Number(a.recommended)||a.name.localeCompare(b.name,'pt-BR')||a.key.localeCompare(b.key));
}

export function initialQuotationSelection(choices:QuotationContactChoice[]):string[]{
 return choices.filter(choice=>choice.recommended&&!choice.disabledReason).slice(0,100).map(choice=>choice.key);
}
const searchText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function filterQuotationChoices(choices:QuotationContactChoice[],query:string,mode:'all'|'recommended'|'selected',selected:string[]):QuotationContactChoice[]{
 const text=searchText(query),digits=query.replace(/\D/g,''),phoneQuery=!!digits&&/^[+\d\s().-]+$/.test(query);
 const selectedKeys=new Set(selected);
 return choices.filter(choice=>{
  if(mode==='recommended'&&!choice.recommended||mode==='selected'&&!selectedKeys.has(choice.key))return false;
  return !text||searchText([choice.name,choice.company,choice.phone,choice.category,choice.sourceLabel].filter(Boolean).join(' ')).includes(text)||phoneQuery&&choice.phone.replace(/\D/g,'').includes(digits);
 });
}
