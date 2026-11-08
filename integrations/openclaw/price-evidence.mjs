const compact=value=>String(value||'').replace(/\s+/g,' ').trim();
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
 const prices=[...a.priceQuote.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})(?!\d)/g)].map(m=>Number(m[1].replace(/\./g,'').replace(',','.')));
 if(!prices.includes(a.priceAmount))return null;
 const unitPrice=Math.round(a.priceAmount/a.packageQuantity*100)/100;
 return unitPrice>0?{unitPrice}:null;
}
