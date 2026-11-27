import {quoteTotal, type Estimate, type EstimateEdit, type Item, type Purchase, type Settings} from './model';

// Estimativa por item (spec 2026-11-26, E1; ADR 0003). Cada valor é uma linha de
// produto, frete ou ICMS com origem, fonte, autor e data. Os registros gravados antes
// deste formato (referências + frete único) são lidos aqui sem migração nem regravação.
export type EstimateLineKind='product'|'freight'|'icms';
// automatic: comprovado pela página; to_check: a conferir; accepted: a conferir aceito pela
// Diretoria Administrativa; manual: informado por ela; not_applicable: assinaturas digitais;
// awaiting_accountant: ICMS desligado até a confirmação do contador; pending: sem valor
// (pendência de estimativa ou, nos registros antigos, frete não apurado).
export type EstimateOrigin='automatic'|'to_check'|'accepted'|'manual'|'not_applicable'|'awaiting_accountant'|'pending';
export type EstimateLine={
  kind:EstimateLineKind;
  // Linha da solicitação inteira quando ausente (frete único dos registros antigos).
  itemIndex?:number;
  // Produto: preço unitário. Frete e ICMS: valor da linha. null quando ainda sem valor.
  value:number|null;
  origin:EstimateOrigin;
  sourceName?:string;
  sourceUrl?:string;
  researchedOn?:string;
  // Motivo da marca a conferir ou da pendência.
  reason?:string;
  // Ausente nas estimativas manuais antigas, que não registravam a autoria no próprio valor.
  author?:string;
  at:string;
  // Nova busca deste item em andamento na revisão (ticket 04): revisão do critério que a
  // originou. Só o resultado dessa busca preenche a linha; preço manual retira a marca.
  searchRevision?:string;
  // Frete por percentual (ticket 06): percentual aplicado e subtotal do produto usado no
  // cálculo. Quando o produto muda, a linha é recalculada e volta a ser a conferir.
  freightPercent?:number;
  freightBasis?:number;
  // Frete da loja (ticket 07): frete exibido pela mesma página do preço do produto, simulado
  // até o CEP comercial da escola. Vale enquanto o produto mantém essa fonte.
  freightSource?:'store';
};
export type EstimateView={format:'legacy'|'items-v1';lines:EstimateLine[];total:number;freightKnown:boolean;method:'automatic'|'manual';notes:string;recordedAt:string};

const cents=(v:number)=>Math.round(v*100)/100;
export function estimateLinesTotal(lines:EstimateLine[],items:Pick<Item,'quantity'>[]){
  return cents(lines.reduce((sum,l)=>{
    if(l.value===null)return sum;
    if(l.kind==='product')return sum+(items[l.itemIndex!]?.quantity??0)*l.value;
    return sum+l.value;
  },0));
}

function legacyLines(e:Estimate):EstimateLine[] {
  const automatic=e.method==='automatic';
  const lines:EstimateLine[]=e.references.map((ref,itemIndex)=>({kind:'product',itemIndex,value:ref.unitPrice,origin:automatic?'automatic':'manual',sourceName:ref.sourceName,sourceUrl:ref.sourceUrl,researchedOn:ref.researchedOn,...(automatic?{author:'Sistema'}:{}),at:e.recordedAt}));
  lines.push(e.freightKnown===false
    ?{kind:'freight',value:null,origin:'pending',reason:'Frete não apurado — não incluído no total',...(automatic?{author:'Sistema'}:{}),at:e.recordedAt}
    :{kind:'freight',value:e.freight,origin:'manual',at:e.recordedAt});
  return lines;
}

// Única leitura da estimativa para exibição e para as próximas regras por item.
export function readEstimate(r:Pick<Purchase,'items'|'estimate'>):EstimateView|undefined {
  const e=r.estimate;
  if(!e)return undefined;
  const method=e.method==='automatic'?'automatic':'manual';
  if(Array.isArray(e.lines)){
    const freight=e.lines.filter(l=>l.kind==='freight');
    return {format:'items-v1',lines:e.lines,total:estimateLinesTotal(e.lines,r.items),freightKnown:freight.length>0&&freight.every(l=>l.value!==null||l.origin==='not_applicable'),method,notes:e.notes,recordedAt:e.recordedAt};
  }
  // O total antigo é o gravado no registro: é o que o painel, o resumo mensal e a
  // Diretoria Geral sempre mostraram.
  return {format:'legacy',lines:legacyLines(e),total:e.total,freightKnown:e.freightKnown!==false,method,notes:e.notes,recordedAt:e.recordedAt};
}
export const estimateFreight=(v:EstimateView)=>cents(v.lines.reduce((s,l)=>l.kind==='freight'&&l.value!==null?s+l.value:s,0));

// Itens sem preço (pendência de estimativa). Frete não apurado dos registros antigos
// continua permitido, como antes; frete e ICMS entram nas próximas etapas do E1.
export function estimatePendingItems(r:Pick<Purchase,'items'|'estimate'>){
  return (readEstimate(r)?.lines||[]).filter(l=>l.kind==='product'&&l.value===null).map(l=>({itemIndex:l.itemIndex!,reason:l.reason,searching:!!l.searchRevision}));
}
// Valores a conferir ainda não aceitos nem substituídos (ticket 05): também impedem o envio.
export function estimateToCheckItems(r:Pick<Purchase,'items'|'estimate'>){
  return (readEstimate(r)?.lines||[]).filter(l=>l.kind==='product'&&l.origin==='to_check'&&l.value!==null).map(l=>({itemIndex:l.itemIndex!,reason:l.reason,value:l.value!}));
}
export function estimatePendingMessage(r:Pick<Purchase,'items'|'estimate'>){
  const n=estimatePendingItems(r).length,c=estimateToCheckItems(r).length;
  const parts=[n&&`Há pendência de estimativa em ${n===1?'1 item':n+' itens'}. Informe o preço`,c&&`Há ${c===1?'1 valor':c+' valores'} a conferir. Aceite ou substitua o valor`];
  return n||c?parts.filter(Boolean).join('. ')+' antes de enviar à Diretoria Geral.':undefined;
}

// Monta a estimativa no formato por item mantendo os campos antigos coerentes para os
// consumidores que ainda os leem (resumo mensal, redução de escopo, formulário manual).
// references só é preenchido, alinhado aos itens, quando todos os produtos têm valor.
export function estimateFromLines(lines:EstimateLine[],items:Pick<Item,'quantity'|'subscription'>[],base:{notes:string;recordedAt:string;method:'automatic'|'manual'},policy?:FreightPolicy):Estimate{
  if(policy)lines=withFreightLines(lines,items,policy);
  const products=items.map((_,i)=>lines.find(l=>l.kind==='product'&&l.itemIndex===i));
  const complete=products.every(l=>l&&l.value!==null);
  const freight=lines.filter(l=>l.kind==='freight');
  return {...base,lines,total:estimateLinesTotal(lines,items),freight:cents(freight.reduce((s,l)=>s+(l.value??0),0)),freightKnown:freight.length>0&&freight.every(l=>l.value!==null||l.origin==='not_applicable'),
    references:complete?products.map(l=>({unitPrice:l!.value!,sourceUrl:l!.sourceUrl||'',sourceName:l!.sourceName||'',researchedOn:l!.researchedOn||base.recordedAt.slice(0,10)})):[]};
}

// Redução de escopo pela Diretoria Geral: mantém só os itens escolhidos, renumerados.
export function reduceEstimate(e:Estimate,indexes:number[],items:Item[],note:string):Estimate{
  if(!Array.isArray(e.lines)){
    const refs=indexes.map(i=>e.references[i]);
    return {...e,references:refs,total:quoteTotal(items,refs.map(r=>r.unitPrice),e.freight),notes:e.notes+note};
  }
  const lines=e.lines.flatMap(l=>l.itemIndex===undefined?[l]:indexes.includes(l.itemIndex)?[{...l,itemIndex:indexes.indexOf(l.itemIndex)}]:[]);
  return estimateFromLines(lines,items,{notes:e.notes+note,recordedAt:e.recordedAt,method:e.method});
}

// Revisão da estimativa (ticket 03): a Diretoria Administrativa informa preço e fonte só
// nos itens sem valor automático — pendência, valor manual a corrigir ou a conferir
// (substituição, ticket 05). Linhas automáticas e aceitas permanecem como estão.
export const estimateEditableOrigins:EstimateOrigin[]=['pending','manual','to_check'];
export type EstimateItemEntry={itemIndex:number;unitPrice:number;sourceName:string;sourceUrl:string;researchedOn:string};
export class EstimateEditError extends Error {constructor(message:string,public status=400){super(message)}}
// Aceitar um valor a conferir (ticket 05): a linha passa a accepted em nome de quem aceitou,
// mantendo valor, fonte e motivo. Só linhas to_check podem ser aceitas.
export function acceptEstimateItem(r:Pick<Purchase,'items'|'estimate'>,itemIndex:number,actor:string,now:string,policy?:FreightPolicy):{estimate:Estimate;edit:EstimateEdit}{
  const e=r.estimate;
  if(!e||!Array.isArray(e.lines))throw new EstimateEditError('O aceite vale para estimativas por item.',409);
  if(!r.items[itemIndex])throw new EstimateEditError('Item inexistente nesta solicitação.');
  const lines=[...e.lines],at=lines.findIndex(l=>l.kind==='product'&&l.itemIndex===itemIndex),previous=lines[at];
  if(!previous||previous.origin!=='to_check'||previous.value===null)throw new EstimateEditError(`${r.items[itemIndex].name} não tem valor a conferir para aceitar.`,409);
  const line:EstimateLine={...previous,origin:'accepted',author:actor,at:now};
  lines[at]=line;
  return {estimate:estimateFromLines(lines,r.items,{notes:e.notes,recordedAt:e.recordedAt,method:e.method},policy),edit:{itemIndex,actor,at:now,previous,line,action:'accept'}};
}
export function fillEstimateItems(r:Pick<Purchase,'items'|'estimate'>,entries:EstimateItemEntry[],actor:string,now:string,policy?:FreightPolicy):{estimate:Estimate;edits:EstimateEdit[]}{
  const e=r.estimate;
  if(!e||!Array.isArray(e.lines))throw new EstimateEditError('O preenchimento por item vale para estimativas por item. Registre a estimativa completa.',409);
  const lines=[...e.lines],edits:EstimateEdit[]=[];
  for(const entry of entries){
    if(!r.items[entry.itemIndex])throw new EstimateEditError('Item inexistente nesta solicitação.');
    const at=lines.findIndex(l=>l.kind==='product'&&l.itemIndex===entry.itemIndex),previous=lines[at];
    if(previous&&!estimateEditableOrigins.includes(previous.origin))throw new EstimateEditError(`O preço automático de ${r.items[entry.itemIndex].name} permanece. Informe preço só nos itens com pendência.`,409);
    const line:EstimateLine={kind:'product',itemIndex:entry.itemIndex,value:entry.unitPrice,origin:'manual',sourceName:entry.sourceName,sourceUrl:entry.sourceUrl,researchedOn:entry.researchedOn,author:actor,at:now};
    const before=previous||{kind:'product',itemIndex:entry.itemIndex,value:null,origin:'pending',at:e.recordedAt};
    if(at<0)lines.push(line);else lines[at]=line;
    edits.push({itemIndex:entry.itemIndex,actor,at:now,previous:before,line});
  }
  return {estimate:estimateFromLines(lines,r.items,{notes:e.notes,recordedAt:e.recordedAt,method:e.method},policy),edits};
}

// Frete estimado (E1, tickets 06 e 07; ADR 0003). O frete de cada item vem da loja onde o
// preço foi encontrado (linha freightSource 'store', gravada pela pesquisa); ela permanece
// enquanto o produto mantém essa fonte. Sem frete da loja, o plano B é o percentual padrão
// do Master sobre o subtotal do produto, marcado a conferir.
// Assinaturas digitais: não se aplica. Sem percentual configurado ou sem preço do produto,
// a linha fica pendente com o motivo. Frete manual permanece; frete aceito permanece
// enquanto o produto não muda. A linha única "frete não apurado" das estimativas por item
// gravadas antes deste ticket é substituída pelas linhas por item.
export type FreightPolicy={percent?:number|null;digital?:boolean};
export const freightPolicy=(r:Pick<Purchase,'form'>,settings:Pick<Settings,'freightPercent'>|undefined):FreightPolicy=>({percent:settings?.freightPercent,digital:r.form?.kind==='digital'});
export const freightPercentLabel=(p:number)=>p.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
export const freightNoPercentReason='Percentual padrão de frete não configurado pelo Master. Informe o frete manualmente ou peça ao Master para configurar.';
const percentReason=(product:EstimateLine,percent:number)=>`Frete por percentual — ${product.origin==='manual'?'preço do produto informado manualmente':'loja não exibiu frete'} (${freightPercentLabel(percent)} sobre o valor do produto).`;
export function withFreightLines(lines:EstimateLine[],items:Pick<Item,'quantity'|'subscription'>[],policy:FreightPolicy):EstimateLine[]{
  if(lines.some(l=>l.kind==='freight'&&l.itemIndex===undefined&&l.value!==null))return lines;
  const at=lines.reduce((m,l)=>l.at>m?l.at:m,'');
  const out=lines.filter(l=>!(l.kind==='freight'&&(l.itemIndex===undefined||!items[l.itemIndex])));
  const percent=typeof policy.percent==='number'&&Number.isFinite(policy.percent)?policy.percent:undefined;
  items.forEach((item,i)=>{
    const product=out.find(l=>l.kind==='product'&&l.itemIndex===i);
    const k=out.findIndex(l=>l.kind==='freight'&&l.itemIndex===i),current=k<0?undefined:out[k];
    const basis=product&&product.value!==null?cents(item.quantity*product.value):undefined;
    let next:EstimateLine;
    if(policy.digital||item.subscription)next={kind:'freight',itemIndex:i,value:null,origin:'not_applicable',reason:'Assinatura digital: frete não se aplica.',author:'Sistema',at};
    else if(current?.origin==='manual')return;
    else if(current?.freightSource==='store'&&product&&product.value!==null&&current.sourceUrl===product.sourceUrl)return;
    else if(current&&basis!==undefined&&current.freightBasis===basis&&(current.origin==='accepted'||current.origin==='to_check'&&current.freightPercent===percent))return;
    else if(basis===undefined)next={kind:'freight',itemIndex:i,value:null,origin:'pending',reason:'Frete aguardando o preço do produto.',author:'Sistema',at};
    else if(percent===undefined)next={kind:'freight',itemIndex:i,value:null,origin:'pending',reason:'Loja não exibiu frete. '+freightNoPercentReason,author:'Sistema',at};
    else next={kind:'freight',itemIndex:i,value:cents(basis*percent/100),origin:'to_check',reason:percentReason(product!,percent),sourceName:'Percentual padrão de frete',freightPercent:percent,freightBasis:basis,author:'Sistema',at};
    if(current&&JSON.stringify({...current,at:''})===JSON.stringify({...next,at:''}))return;
    if(k<0)out.push(next);else out[k]=next;
  });
  return out;
}

// Envio à Diretoria Geral (ticket 06): além das pendências de produto e dos a conferir,
// todo item precisa de frete aceito, manual ou não se aplica. Estimativas por item sem
// linha de frete do item (gravadas antes do ticket 06) contam como frete pendente; no
// formato antigo vale o frete único: "frete não apurado" impede o envio. Não vale para
// pedidos já enviados à Diretoria Geral (a decisão da DG usa estimatePendingMessage).
export function estimateFreightIssues(r:Pick<Purchase,'items'|'estimate'|'form'>):{pending:{itemIndex?:number;reason?:string}[];toCheck:{itemIndex:number;reason?:string;value:number}[]}{
  const view=readEstimate(r);
  if(!view||r.form?.kind==='digital')return {pending:[],toCheck:[]};
  const freight=view.lines.filter(l=>l.kind==='freight');
  if(view.format==='legacy')return {pending:freight.filter(l=>l.value===null&&l.origin==='pending').map(l=>({reason:l.reason})),toCheck:[]};
  const pending:{itemIndex?:number;reason?:string}[]=[],toCheck:{itemIndex:number;reason?:string;value:number}[]=[];
  r.items.forEach((item,i)=>{
    const l=freight.find(l=>l.itemIndex===i);
    if(!l){if(!item.subscription)pending.push({itemIndex:i,reason:'Frete ainda não calculado para este item.'});return}
    if(l.origin==='to_check'&&l.value!==null)toCheck.push({itemIndex:i,reason:l.reason,value:l.value});
    else if(l.value===null&&l.origin==='pending')pending.push({itemIndex:i,reason:l.reason});
  });
  return {pending,toCheck};
}
export function estimateSendBlockMessage(r:Pick<Purchase,'items'|'estimate'|'form'>){
  const base=estimatePendingMessage(r)?.replace(/ antes de enviar à Diretoria Geral\.$/,'');
  const {pending,toCheck}=estimateFreightIssues(r);
  const n=pending.length,c=toCheck.length;
  const parts=[base,n&&`Há frete pendente em ${n===1?'1 item':n+' itens'}. Informe o frete`,c&&`Há ${c===1?'1 frete':c+' fretes'} a conferir. Aceite ou substitua o frete`].filter(Boolean);
  return parts.length?parts.join('. ')+' antes de enviar à Diretoria Geral.':undefined;
}
// Composição da estimativa para a Diretoria Administrativa e a Diretoria Geral (ticket 06):
// produtos, frete e total geral separados. O total geral é o da estimativa (produtos + frete),
// e o frete é somado uma única vez.
export function estimateComposition(r:Pick<Purchase,'items'|'estimate'>){
  const view=readEstimate(r);
  if(!view)return undefined;
  const freight=estimateFreight(view);
  return {products:cents(view.total-freight),freight,total:view.total};
}

// Frete manual na revisão (ticket 06): valor da linha de frete do item, com fonte ou
// justificativa. Vale para frete pendente, a conferir ou manual a corrigir.
export type EstimateFreightEntry={itemIndex:number;value:number;sourceName:string;sourceUrl?:string};
export function fillEstimateFreight(r:Pick<Purchase,'items'|'estimate'|'form'>,entries:EstimateFreightEntry[],actor:string,now:string,policy:FreightPolicy):{estimate:Estimate;edits:EstimateEdit[]}{
  const e=r.estimate;
  if(!e||!Array.isArray(e.lines))throw new EstimateEditError('O frete por item vale para estimativas por item. Registre a estimativa completa.',409);
  let lines=withFreightLines(e.lines,r.items,policy);const edits:EstimateEdit[]=[];
  for(const entry of entries){
    const item=r.items[entry.itemIndex];
    if(!item)throw new EstimateEditError('Item inexistente nesta solicitação.');
    const at=lines.findIndex(l=>l.kind==='freight'&&l.itemIndex===entry.itemIndex),previous=lines[at];
    if(!previous||!estimateEditableOrigins.includes(previous.origin))throw new EstimateEditError(previous?.origin==='not_applicable'?`Frete não se aplica a ${item.name}.`:`O frete de ${item.name} já foi aceito e permanece.`,409);
    const line:EstimateLine={kind:'freight',itemIndex:entry.itemIndex,value:cents(entry.value),origin:'manual',sourceName:entry.sourceName,...(entry.sourceUrl?{sourceUrl:entry.sourceUrl}:{}),author:actor,at:now};
    lines=[...lines];lines[at]=line;
    edits.push({itemIndex:entry.itemIndex,actor,at:now,previous,line,kind:'freight',action:'fill'});
  }
  return {estimate:estimateFromLines(lines,r.items,{notes:e.notes,recordedAt:e.recordedAt,method:e.method},policy),edits};
}
export function acceptEstimateFreight(r:Pick<Purchase,'items'|'estimate'|'form'>,itemIndex:number,actor:string,now:string,policy:FreightPolicy):{estimate:Estimate;edit:EstimateEdit}{
  const e=r.estimate;
  if(!e||!Array.isArray(e.lines))throw new EstimateEditError('O aceite vale para estimativas por item.',409);
  if(!r.items[itemIndex])throw new EstimateEditError('Item inexistente nesta solicitação.');
  const lines=withFreightLines(e.lines,r.items,policy),at=lines.findIndex(l=>l.kind==='freight'&&l.itemIndex===itemIndex),previous=lines[at];
  if(!previous||previous.origin!=='to_check'||previous.value===null)throw new EstimateEditError(`${r.items[itemIndex].name} não tem frete a conferir para aceitar.`,409);
  const line:EstimateLine={...previous,origin:'accepted',author:actor,at:now};
  lines[at]=line;
  return {estimate:estimateFromLines(lines,r.items,{notes:e.notes,recordedAt:e.recordedAt,method:e.method},policy),edit:{itemIndex,actor,at:now,previous,line,kind:'freight',action:'accept'}};
}
// Recalcula as linhas de frete pelo percentual atual (frete manual e aceito permanecem).
export function applyFreightPercent(r:Pick<Purchase,'items'|'estimate'|'form'>,actor:string,now:string,policy:FreightPolicy):{estimate:Estimate;edits:EstimateEdit[]}{
  const e=r.estimate;
  if(!e||!Array.isArray(e.lines))throw new EstimateEditError('O frete por percentual vale para estimativas por item. Informe o frete na estimativa completa.',409);
  if(typeof policy.percent!=='number'&&!policy.digital)throw new EstimateEditError(freightNoPercentReason,409);
  const lines=withFreightLines(e.lines,r.items,policy).map(l=>l.kind==='freight'&&l.author==='Sistema'&&!e.lines!.includes(l)?{...l,at:now}:l);
  const edits:EstimateEdit[]=lines.filter(l=>l.kind==='freight'&&!e.lines!.includes(l)&&l.itemIndex!==undefined).map(l=>({itemIndex:l.itemIndex!,actor,at:now,previous:e.lines!.find(p=>p.kind==='freight'&&p.itemIndex===l.itemIndex)||{kind:'freight',itemIndex:l.itemIndex,value:null,origin:'pending',at:e.recordedAt},line:l,kind:'freight',action:'freight_percent'}));
  if(!edits.length)throw new EstimateEditError('O frete já está calculado pelo percentual atual.',409);
  return {estimate:estimateFromLines(lines,r.items,{notes:e.notes,recordedAt:e.recordedAt,method:e.method}),edits};
}
