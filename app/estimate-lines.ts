import type {Estimate, Item, Purchase} from './model';

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
    return {format:'items-v1',lines:e.lines,total:estimateLinesTotal(e.lines,r.items),freightKnown:freight.length>0&&freight.every(l=>l.value!==null),method,notes:e.notes,recordedAt:e.recordedAt};
  }
  // O total antigo é o gravado no registro: é o que o painel, o resumo mensal e a
  // Diretoria Geral sempre mostraram.
  return {format:'legacy',lines:legacyLines(e),total:e.total,freightKnown:e.freightKnown!==false,method,notes:e.notes,recordedAt:e.recordedAt};
}
export const estimateFreight=(v:EstimateView)=>cents(v.lines.reduce((s,l)=>l.kind==='freight'&&l.value!==null?s+l.value:s,0));
