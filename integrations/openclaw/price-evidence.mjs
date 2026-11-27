const compact=value=>String(value||'').replace(/\s+/g,' ').trim();
const pricesIn=text=>[...String(text||'').matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})(?!\d)/g)].map(m=>Number(m[1].replace(/\./g,'').replace(',','.')));
/** Validate the operational agent's analysis against the supplied page evidence.
 * @param {{name:string,spec?:string,unit:string}} item
 * @param {{url?:string,title:string,text:string,analysis?:any}} page
 */
export function extractReference(item,page) {
 const a=page?.analysis;
 if(!a||a.status!=='verified'||a.sourceUrl!==page.url||a.currency!=='BRL'||a.priceType!=='total'||a.itemMatches!==true||a.unitMatches!==true)return null;
 if(a.unit!==item.unit||typeof a.priceAmount!=='number'||!Number.isFinite(a.priceAmount)||a.priceAmount<=0||a.priceAmount>10000000||!Number.isInteger(a.packageQuantity)||a.packageQuantity<1||a.packageQuantity>100000)return null;
 if(typeof a.reason!=='string'||a.reason.trim().length<10||a.reason.length>2000||typeof a.productName!=='string'||a.productName.trim().length<2||a.productName.length>300)return null;
 const evidence=compact(page.text);
 for(const quote of [a.productQuote,a.priceQuote,a.unitQuote])if(typeof quote!=='string'||quote.trim().length<3||quote.length>2000||!evidence.includes(compact(quote)))return null;
 if(!pricesIn(a.priceQuote).includes(a.priceAmount))return null;
 const unitPrice=Math.round(a.priceAmount/a.packageQuantity*100)/100;
 return unitPrice>0?{unitPrice}:null;
}

/** Desfecho da busca de um item (E1, ticket 05), regra única da ponte e do Site.
 * verified: a página comprova produto, unidade e preço (extractReference).
 * to_check: o preço total em BRL aparece na própria página, mas a comprovação é incompleta
 * (produto parecido, unidade/embalagem diferente, trecho incompleto); vai com o motivo.
 * pending: sem preço utilizável. Preço que não aparece na página nunca vira valor.
 * @returns {{outcome:'verified',unitPrice:number}|{outcome:'to_check',unitPrice:number,reason:string}|{outcome:'pending',reason:string}}
 */
export function classifyEvidence(item,page) {
 const verified=extractReference(item,page);
 if(verified)return {outcome:'verified',unitPrice:verified.unitPrice};
 const a=page?.analysis;
 const said=typeof a?.reason==='string'&&a.reason.trim().length>=10?compact(a.reason):'';
 const pending=reason=>({outcome:'pending',reason:(said||reason).slice(0,800)});
 if(!a||!['verified','to_check'].includes(a.status))return pending('Preço não comprovado pelas páginas pesquisadas.');
 if(a.sourceUrl!==page.url||a.currency!=='BRL'||a.priceType!=='total')return pending('A página não mostra um preço total em reais deste produto.');
 const evidence=compact(page.text);
 if(typeof a.priceAmount!=='number'||!Number.isFinite(a.priceAmount)||a.priceAmount<=0||a.priceAmount>10000000||!pricesIn(evidence).includes(a.priceAmount))return {outcome:'pending',reason:'O preço indicado pela análise não aparece na página consultada.'};
 const quoted=q=>typeof q==='string'&&q.trim().length>=3&&q.length<=2000&&evidence.includes(compact(q));
 const packaged=Number.isInteger(a.packageQuantity)&&a.packageQuantity>=1&&a.packageQuantity<=100000;
 const issues=[];
 if(a.itemMatches!==true)issues.push('produto parecido, não idêntico ao solicitado');
 if(a.unitMatches!==true||a.unit!==item.unit)issues.push('unidade ou embalagem diferente da solicitada');
 if(!packaged)issues.push('quantidade por embalagem não confirmada (considerada 1)');
 if(!quoted(a.productQuote))issues.push('trecho do produto incompleto');
 if(!quoted(a.priceQuote)||!pricesIn(a.priceQuote).includes(a.priceAmount))issues.push('trecho do preço incompleto');
 if(!quoted(a.unitQuote))issues.push('trecho da unidade incompleto');
 if(!issues.length)issues.push('comprovação incompleta');
 const unitPrice=Math.round(a.priceAmount/(packaged?a.packageQuantity:1)*100)/100;
 if(!(unitPrice>0))return pending('Preço por unidade não calculável.');
 return {outcome:'to_check',unitPrice,reason:('A conferir: '+issues.join('; ')+'.'+(said?' '+said:'')).slice(0,800)};
}

/** Frete da loja até o CEP comercial da escola (E1, ticket 07), regra única da ponte e do Site.
 * Lê analysis.freight da mesma página onde o preço foi encontrado.
 * verified: valor (ou "grátis") literal na página, simulado até o CEP da escola com a
 * quantidade pedida. to_check: valor literal, mas aproximado/deduzido, sem destino
 * confirmado no CEP da escola ou com outra quantidade; vai com o motivo.
 * Linha "conferido no checkout, sem concluir compra" (navegador compras) = conferido no
 * checkout; "a conferir"/"ambíguo" no trecho = a conferir.
 * null: a loja não exibiu frete utilizável (o Site usa o percentual ou deixa pendente).
 * Valor que não aparece na página nunca vira frete.
 * @param {{quantity:number,unit:string}} item
 * @param {{text:string,analysis?:any}|undefined} page
 * @param {{cep:string}} destination
 * @returns {{outcome:'verified'|'to_check',value:number,reason:string}|null}
 */
export function classifyFreight(item,page,destination) {
 const f=page?.analysis?.freight;
 if(!f||typeof f!=='object'||!['quoted','free'].includes(f.status))return null;
 const evidence=compact(page.text);
 if(typeof f.quote!=='string'||f.quote.trim().length<3||f.quote.length>2000||!evidence.includes(compact(f.quote)))return null;
 const quote=compact(f.quote);
 let value;
 if(f.status==='free'){if(!/gr[aá]tis/i.test(quote)||pricesIn(quote).some(v=>v>0))return null;value=0;}
 else{if(typeof f.amount!=='number'||!Number.isFinite(f.amount)||f.amount<0||f.amount>1000000||!pricesIn(quote).includes(f.amount))return null;value=Math.round(f.amount*100)/100;}
 const digits=v=>String(v||'').replace(/\D/g,'');
 const cep=digits(destination?.cep),label=cep.length===8?cep.slice(0,5)+'-'+cep.slice(5):'';
 const issues=[];
 if(!label||digits(f.cep)!==cep||!new RegExp('(?<!\\d)'+cep.slice(0,5)+'-?'+cep.slice(5)+'(?!\\d)').test(quote))issues.push('destino da simulação não confirmado no CEP da escola');
 const withoutMoney=quote.replace(/R\$\s*[\d.]+,\d{2}/g,'').replace(/(?<!\d)\d{5}-?\d{3}(?!\d)/g,'');
 if(Number.isInteger(f.quantity)&&f.quantity!==item.quantity)issues.push(`quantidade simulada (${f.quantity}) diferente da pedida (${item.quantity})`);
 else if(f.quantity!==item.quantity||!new RegExp('(?<!\\d)'+item.quantity+'(?!\\d)').test(withoutMoney))issues.push('quantidade da simulação não confirmada');
 if(f.approximate===true)issues.push('valor aproximado ou deduzido pela análise');
 if(/a conferir|amb[ií]guo/i.test(quote))issues.push('valor do checkout ambíguo ou a conferir');
 const said=typeof f.reason==='string'&&f.reason.trim().length>=10?' '+compact(f.reason):'';
 if(!issues.length)return {outcome:'verified',value,reason:/conferido no checkout, sem concluir compra/i.test(quote)?`Frete conferido no checkout da loja até o CEP ${label} para ${item.quantity} ${item.unit}, sem concluir compra.`:`Frete da loja simulado até o CEP ${label} para ${item.quantity} ${item.unit}.`};
 return {outcome:'to_check',value,reason:('Frete da loja a conferir: '+issues.join('; ')+'.'+said).slice(0,800)};
}
