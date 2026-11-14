import type {ContactDraft,ContactParseResult} from './contact-model';
import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';
export const MAX_CONTACT_FILE_BYTES=5*1024*1024;
export const MAX_CONTACTS=5000;

type Row={cells:string[];line:number};
type Issue=ContactParseResult['issues'][number];
const key=(value:string)=>value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_-]/g,' ').replace(/\s+/g,' ');
const clean=(value:string|undefined)=>value?.trim()||undefined;

// Keep the browser preview aligned with contactDraftSchema without importing server code.
function suggestionIssues(contact:ContactDraft,line:number):Issue[] {
 const issues:Issue[]=[];
 if(contact.name.length<2)issues.push({line,message:'Nome do contato deve ter pelo menos 2 caracteres.'});
 for(const [field,label,max] of [
  ['name','Nome',150],['company','Empresa',150],['email','E-mail',150],
  ['category','Categoria',100],['city','Cidade',100],['state','Estado',100],
 ] as const){
  if((contact[field]?.length??0)>max)issues.push({line,message:`${label} ultrapassa o limite de ${max} caracteres.`});
 }
 if(contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))issues.push({line,message:'E-mail inválido.'});
 return issues;
}

function csvDelimiter(text:string):string {
 const counts=new Map([[',',0],[';',0],['\t',0]]);let quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted;}
  else if(!quoted){if(c==='\n')break;if(counts.has(c))counts.set(c,counts.get(c)!+1);}
 }
 return [...counts].sort((a,b)=>b[1]-a[1])[0][0];
}

/** RFC-style CSV scanner tracks physical lines even inside quoted cells. */
function csvRows(text:string,issues:Issue[]):Row[] {
 const separator=csvDelimiter(text),rows:Row[]=[];
 let cells:string[]=[],cell='',quoted=false,closed=false,line=1,start=1;
 const finishCell=()=>{cells.push(cell);cell='';closed=false;};
 const finishRow=()=>{finishCell();if(cells.some(v=>v.trim()))rows.push({cells,line:start});cells=[];start=line+1;};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}
   else{cell+=c;if(c==='\n')line++;}
  }else if(c==='"'){
   if(cell||closed){issues.push({line,message:'Aspas em posição inválida no CSV.'});return [];}
   quoted=true;
  }else if(c===separator)finishCell();
  else if(c==='\n'){finishRow();line++;}
  else if(closed){if(c!==' '&&c!=='\t'){issues.push({line,message:'Texto após o fechamento de aspas no CSV.'});return [];}}
  else cell+=c;
 }
 if(quoted){issues.push({line:start,message:'Campo com aspas não fechado no CSV.'});return [];}
 if(cell||cells.length||closed)finishRow();
 return rows;
}

function csvContacts(text:string,result:ContactParseResult,add:(draft:Omit<ContactDraft,'phone'>,raw:string,line:number)=>void) {
 const rows=csvRows(text,result.issues);if(!rows.length){if(!result.issues.length)result.issues.push({line:1,message:'CSV vazio.'});return;}
 const headers=rows[0].cells.map(key);
 const phones=headers.flatMap((h,i)=>/^(?:telefone|celular|whatsapp|fone|phone|mobile)(?:\s*(?:\d+)?\s*(?:value|valor|numero)?)?$/.test(h)||/^phone \d+ value$/.test(h)?[i]:[]);
 if(!phones.length){result.issues.push({line:rows[0].line,message:'Cabeçalho de telefone não encontrado.'});return;}
 const value=(row:Row,names:string[])=>clean(row.cells[headers.findIndex(h=>names.includes(h))]);
 for(const row of rows.slice(1)){
  if(row.cells.length!==headers.length){result.issues.push({line:row.line,message:'Quantidade de campos diferente do cabeçalho CSV.'});continue;}
  const company=value(row,['empresa','organizacao','organization 1 name','company','organization']);
  const name=value(row,['nome','nome completo','name','full name','display name'])||[value(row,['given name','first name','primeiro nome']),value(row,['additional name','middle name']),value(row,['family name','last name','sobrenome'])].filter(Boolean).join(' ')||company||'';
  const category=value(row,['categoria','category','categories'])||value(row,['group membership'])?.split(' ::: ').filter(v=>!v.startsWith('*')).join(', ')||undefined;
  const draft={name,company,email:value(row,['email','e mail','email address','e mail 1 value']),category,city:value(row,['cidade','city','address 1 city']),state:value(row,['estado','uf','state','address 1 region'])};
  const numbers=phones.flatMap(i=>row.cells[i].split(' ::: ').map(v=>v.trim()).filter(Boolean));
  if(!numbers.length)result.issues.push({line:row.line,message:'Contato sem telefone utilizável.'});
  for(const number of numbers)add(draft,number,row.line);
 }
}

function splitEscaped(value:string,separator:string):string[] {
 const parts:string[]=[];let part='';
 for(let i=0;i<value.length;i++){
  if(value[i]==='\\'&&i+1<value.length){part+=value[i]+value[++i];}
  else if(value[i]===separator){parts.push(part);part='';}
  else part+=value[i];
 }
 parts.push(part);return parts;
}
const unescapeVcf=(value:string)=>value.replace(/\\([nN,;\\])/g,(_,c:string)=>c.toLowerCase()==='n'?'\n':c);

function vcfContacts(text:string,result:ContactParseResult,add:(draft:Omit<ContactDraft,'phone'>,raw:string,line:number)=>void) {
 const lines:{text:string;line:number}[]=[];
 text.split('\n').forEach((value,index)=>{
  if(/^[ \t]/.test(value)&&lines.length)lines[lines.length-1].text+=value.slice(1);
  else lines.push({text:value,line:index+1});
 });
 type Card={start:number;version?:string;fn?:string;n?:string;company?:string;email?:string;category?:string;city?:string;state?:string;phones:{raw:string;line:number}[];invalid:boolean};
 let card:Card|undefined;
 for(const row of lines){
  if(!row.text.trim())continue;
  if(/^BEGIN:VCARD$/i.test(row.text)){
   if(card){result.issues.push({line:row.line,message:'Novo vCard antes do encerramento do anterior.'});card.invalid=true;}
   else card={start:row.line,phones:[],invalid:false};
   continue;
  }
  if(/^END:VCARD$/i.test(row.text)){
   if(!card){result.issues.push({line:row.line,message:'Fim de vCard sem início.'});continue;}
   if(!card.version){result.issues.push({line:card.start,message:'vCard sem VERSION 3.0 ou 4.0.'});card.invalid=true;}
   if(!card.phones.length)result.issues.push({line:card.start,message:'Contato sem telefone utilizável.'});
   if(!card.invalid){const {fn,n,company,email,category,city,state}=card;for(const p of card.phones)add({name:fn||n||company||'',company,email,category,city,state},p.raw,p.line);}
   card=undefined;continue;
  }
  if(!card){result.issues.push({line:row.line,message:'Propriedade fora de BEGIN:VCARD / END:VCARD.'});continue;}
  let colon=-1,quote=false;
  for(let i=0;i<row.text.length;i++){if(row.text[i]==='"')quote=!quote;else if(row.text[i]===':'&&!quote){colon=i;break;}}
  if(colon<1||quote){result.issues.push({line:row.line,message:'Propriedade vCard inválida.'});card.invalid=true;continue;}
  const descriptor=row.text.slice(0,colon),raw=row.text.slice(colon+1),parts=descriptor.split(';'),property=parts[0].split('.').at(-1)!.toUpperCase();
  const params=parts.slice(1).map(v=>v.toUpperCase().replace(/"/g,''));
  if(params.some(v=>v.startsWith('ENCODING='))||params.some(v=>v.startsWith('CHARSET=')&&v!=='CHARSET=UTF-8')){
   result.issues.push({line:row.line,message:'Codificação vCard não suportada; exporte em UTF-8 sem ENCODING.'});card.invalid=true;continue;
  }
  const value=clean(unescapeVcf(raw));
  if(property==='VERSION'){
   if(card.version||!['3.0','4.0'].includes(raw)){result.issues.push({line:row.line,message:'Versão vCard não suportada; use 3.0 ou 4.0.'});card.invalid=true;}
   card.version=raw;
  }else if(property==='FN')card.fn??=value;
  else if(property==='N'){
   const names=splitEscaped(raw,';').map(v=>unescapeVcf(v).trim());card.n??=clean([names[3],names[1],names[2],names[0],names[4]].filter(Boolean).join(' '));
  }else if(property==='ORG')card.company??=clean(unescapeVcf(splitEscaped(raw,';')[0]));
  else if(property==='EMAIL')card.email??=value;
  else if(property==='CATEGORIES')card.category??=clean(splitEscaped(raw,',').map(unescapeVcf).join(', '));
  else if(property==='ADR'){const address=splitEscaped(raw,';').map(unescapeVcf);card.city??=clean(address[3]);card.state??=clean(address[4]);}
  else if(property==='TEL'){
   let phone=raw;
   if(/^tel:/i.test(phone)){phone=phone.slice(4);try{phone=decodeURIComponent(phone);}catch{phone='invalid';}}
   card.phones.push({raw:phone,line:row.line});
  }
 }
 if(card)result.issues.push({line:card.start,message:'vCard sem END:VCARD.'});
 if(!lines.some(row=>/^BEGIN:VCARD$/i.test(row.text))&&!result.issues.length)result.issues.push({line:1,message:'Arquivo vCard vazio.'});
}

/** File parsing produces suggestions only; classification and persistence require review. */
export function parseContactFile(text:string,format:'csv'|'vcf',countryCode='55'):ContactParseResult {
 const result:ContactParseResult={contacts:[],issues:[],duplicates:0,total:0};
 if(new TextEncoder().encode(text).byteLength>MAX_CONTACT_FILE_BYTES){result.issues.push({line:1,message:'O arquivo ultrapassa o limite de 5 MB.'});return result;}
 const unsupported=text.search(/[\u0000\uFFFD]/);
 if(unsupported>=0){result.issues.push({line:text.slice(0,unsupported).split('\n').length,message:'Codificação não suportada ou texto inválido; exporte o arquivo em UTF-8.'});return result;}
 text=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 const seen=new Set<string>();let exceeded=false;
 const add=(draft:Omit<ContactDraft,'phone'>,raw:string,line:number)=>{
  result.total++;
  if(result.total>MAX_CONTACTS){if(!exceeded)result.issues.push({line,message:'O arquivo ultrapassa o limite de 5.000 números; divida o arquivo.'});exceeded=true;return;}
  const phone=normalizeContactPhone(raw,countryCode);
  if(!phone){result.issues.push({line,message:'Telefone inválido ou sem DDI/país definido.'});return;}
  const contact:ContactDraft={name:draft.name||phone,phone};
  for(const field of ['company','email','category','city','state'] as const)if(draft[field])contact[field]=draft[field];
  const issues=suggestionIssues(contact,line);
  if(issues.length){result.issues.push(...issues);return;}
  if(seen.has(phone)){result.duplicates++;return;}
  seen.add(phone);
  result.contacts.push(contact);
 };
 if(format==='csv')csvContacts(text,result,add);
 else if(format==='vcf')vcfContacts(text,result,add);
 else result.issues.push({line:1,message:'Formato não suportado; use CSV ou VCF.'});
 if(exceeded)result.contacts=[];
 return result;
}
