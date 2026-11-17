import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';
import type {Purchase,Supplier} from './model';
import type {InboxMessage,IntegrationJob} from './integration-model';

export type PreliminaryProposal={items:{name:string;quantity?:number;unitPrice?:number;evidence?:string}[];freight?:number;total?:number;currency?:'BRL'|'USD'|'EUR';conditions?:string;deliveryDays?:number;deliveryText?:string;validUntil?:string;warnings:string[]};
export type MessageLink={requestId?:string;supplierId?:string;candidateIds:string[];evidence:string[];reason:string};
const key=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const amount='(\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)(?![\\d.,])';
const number=(s:string)=>Number(s.includes(',')?s.replace(/[. ]/g,'').replace(',','.'): /^\d{1,3}(?:\.\d{3})+$/.test(s)?s.replace(/\./g,''):s.replace(/ /g,''));
const itemTokens=(name:string)=>key(name).split(/\W+/).filter(w=>w.length>1&&!['para','de','do','da','dos','das','com','em','por'].includes(w)).map(w=>w.length>3?w.replace(/s$/,''):w);
const namesItem=(line:string,name:string)=>itemTokens(name).every(token=>key(line).split(/\W+/).some(word=>(word.length>3?word.replace(/s$/,''):word)===token));
const unique=(values:number[])=>{const found=[...new Set(values)];return found.length===1?found[0]:undefined};
const matches=(text:string,pattern:RegExp)=>[...text.matchAll(pattern)].map(m=>number(m[1]));

/** Only explicit facts are suggested. Unknown values remain absent. Never executes supplied instructions. */
export function extractProposal(text:string,request:Pick<Purchase,'items'>):PreliminaryProposal {
 const source=key(text),warnings:string[]=[];
 const foreign=/\b(?:usd|eur|dolares?|euros?)\b|US\$/i.test(text);
 const currency=foreign?(/\b(?:eur|euros?)\b/i.test(text)?'EUR':'USD'):/R\$|\breais\b|\bBRL\b/i.test(text)?'BRL':undefined;
 const lines=source.split(/\n/);
 const items=request.items.map(item=>{
  const itemLines=lines.flatMap((line,index)=>{
   if(!namesItem(line,item.name)||request.items.filter(other=>namesItem(line,other.name)).length!==1)return [];
   const block=[line];for(let i=index+1;i<lines.length&&!request.items.some(other=>namesItem(lines[i],other.name));i++)block.push(lines[i]);return [block.join(' ')];
  });
  const evidence=itemLines.length===1?itemLines[0]:undefined;
  if(!evidence)return {name:item.name};
  const prices=[...matches(evidence,new RegExp('(?:unitario|unitaria|preco unitario|cada)\\s*[:=]?\\s*(?:r\\$\\s*)?'+amount,'g')),...matches(evidence,new RegExp(amount+'\\s*(?:reais|r\\$)?\\s*(?:cada|por unidade|/\\s*un\\b)','g')),...matches(evidence,new RegExp('\\bx\\s*r\\$\\s*'+amount,'g'))];
  const quantityUnits=[key(item.unit),...itemTokens(item.name)].map(escape).join('|');
  const quantities=[...matches(evidence,/(?:qtd\.?|quantidade)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/g),...matches(evidence,new RegExp('\\bpara\\s+(\\d+(?:[.,]\\d+)?)\\s+(?:'+quantityUnits+')s?\\b','g')),...matches(evidence,new RegExp('\\b(\\d+(?:[.,]\\d+)?)\\s*(?:'+escape(key(item.unit))+'s?\\b|x\\s*r\\$)','g'))];
  return {name:item.name,unitPrice:unique(prices),quantity:unique(quantities),evidence};
 });
 const freight=unique(matches(source,new RegExp('frete\\s*[:=]?\\s*(?:r\\$\\s*)?'+amount+'\\s*(?:reais)?','g')));
 const freeFreight=/frete\s*(?:gratis|gratuito|incluso|incluido)/.test(source)&&!/acima|a partir|\bse\b|exceto|nao|não|somente|apenas/.test(source);
 const total=unique(matches(source,new RegExp('(?<!sub)\\btotal\\s*(?:de|:|=)?\\s*(?:r\\$\\s*)?'+amount+'\\s*(?:reais)?','g')));
 const conditions=text.split(/\n/).filter(line=>/pagamento|condi[çc][õo]es|\bpix\b|boleto/i.test(line)).join('\n').slice(0,1000)||undefined;
 const deliveryText=text.split(/\n/).find(line=>/prazo|entrega/i.test(line));
 const deliveryDays=deliveryText&&!/uteis|úteis/i.test(deliveryText)?unique(matches(key(deliveryText),/(?:prazo|entrega)[^\n\d]{0,30}(\d+)\s*dias?\b/g)):undefined;
 const validity=source.match(/validade\s*[:=]?\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/);
 let validUntil=validity?.[1];if(validUntil?.includes('/'))validUntil=validUntil.split('/').reverse().join('-');
 if(validUntil&&(!Number.isFinite(Date.parse(validUntil))||new Date(validUntil).toISOString().slice(0,10)!==validUntil))validUntil=undefined;
 if(items.some(i=>i.unitPrice===undefined||i.quantity===undefined))warnings.push('Conferir preços unitários e quantidades não identificados.');
 if(freight===undefined&&!freeFreight)warnings.push('Frete não informado; não foi presumido zero.');
 if(deliveryText&&deliveryDays===undefined)warnings.push('Prazo exige conferência; dias úteis não foram convertidos.');
 if(!currency)warnings.push('Moeda não identificada; confirme antes de registrar.');
 if(total!==undefined&&items.every(i=>i.unitPrice!==undefined&&i.quantity!==undefined)&&freight!==undefined&&Math.abs(items.reduce((sum,i)=>sum+i.unitPrice!*i.quantity!,0)+freight-total)>0.01)warnings.push('Total informado diverge dos itens e frete; confira despesas e valores.');
 return {items,freight:freight??(freeFreight?0:undefined),total,currency,conditions,deliveryDays,deliveryText,validUntil,warnings};
}

/** Receipts only count if actually sent to this exact sender before the response. */
export function associateMessage(message:Pick<InboxMessage,'from'|'text'|'receivedAt'|'replyToMessageId'|'correlationJobId'>,requests:Purchase[],suppliers:Supplier[],jobs:IntegrationJob[]):MessageLink {
 const available=requests.filter(r=>!r.archived&&r.generalApproval&&['quoting','national'].includes(r.status));
 const supplierMatches=suppliers.filter(s=>!s.removed&&normalizeContactPhone(s.phone)===message.from);
 const supplierId=supplierMatches.length===1?supplierMatches[0].id:undefined;
 const sent=jobs.filter(j=>j.type==='whatsapp_quote'&&j.accountId==='operacional'&&j.schoolPhone==='+559292017107'&&j.state==='done'&&!!j.providerMessageId&&!!j.sentAt&&Date.parse(j.sentAt)<=Date.parse(message.receivedAt)&&j.target===message.from&&available.some(r=>r.id===j.requestId));
 const codeRequests=available.filter(r=>new RegExp('\\b'+escape(r.code)+'\\b','i').test(message.text));
 const mentionedCodes=message.text.match(/\bCE-[A-Z0-9-]+\b/gi)||[];
 const invalidCode=mentionedCodes.some(code=>!available.some(r=>r.code.toLowerCase()===code.toLowerCase()));
 const replyMatches=message.replyToMessageId?sent.filter(j=>j.providerMessageId===message.replyToMessageId):[];
 const correlationMatches=message.correlationJobId?sent.filter(j=>j.id===message.correlationJobId):[];
 const replies=[...replyMatches,...correlationMatches];
 const invalidReference=!!(message.replyToMessageId&&!replyMatches.length||message.correlationJobId&&!correlationMatches.length);
 const explicitReply=!!(message.replyToMessageId||message.correlationJobId);
 const evidence=[...(codeRequests.length?['Código do pedido no conteúdo']:[]),...(replies.length?['Resposta a envio confirmado']:[])];
 const ids=[...new Set([...codeRequests.map(r=>r.id),...replies.map(j=>j.requestId)])];
 if(!ids.length&&!explicitReply&&!mentionedCodes.length){ids.push(...new Set(sent.map(j=>j.requestId)));if(sent.length===1)evidence.push('Único envio confirmado para este telefone');}
 const valid=ids.length===1&&!invalidReference&&!invalidCode&&evidence.length>0&&(!explicitReply||replies.length>0);
 return {requestId:valid?ids[0]:undefined,supplierId,candidateIds:ids,evidence,reason:!supplierId?'Fornecedor ausente ou telefone com cadastro ambíguo; confira o cadastro antes de confirmar.':valid?'Vínculo por evidência; proposta ainda exige confirmação administrativa.':invalidReference?'Receipt/correlação não confirmado para este telefone.':'Pedido ausente, ambíguo ou evidências conflitantes; selecione na conferência.'};
}
