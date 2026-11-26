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
