import {z} from 'zod';

// ICMS estimado (E1, ticket 08; ADR 0003). Premissa do usuário (27/11/2026): nas compras de
// outro estado a escola paga a diferença de alíquota (DIFAL). O ICMS estimado do item é
// (alíquota interna do AM − alíquota interestadual da UF de origem) × (produto + frete do
// item), pela tabela mantida pelo Master. É referência de custo, não apuração fiscal.
// Nenhuma alíquota deste arquivo é usada no cálculo: só o que o Master salvar vale.
export const brazilStates={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'} as const;
export type Uf=keyof typeof brazilStates;
export const ufs=Object.keys(brazilStates) as Uf[];
export const originUfs=ufs.filter(u=>u!=='AM');
export const isUf=(v:unknown):v is Uf=>typeof v==='string'&&Object.hasOwn(brazilStates,v);

// Exceção opcional (ex.: produto importado): alíquota interestadual que substitui a da UF,
// escolhida pela Diretoria Administrativa ao informar a origem do item.
export type IcmsException={label:string;rate:number};
export type IcmsTable={validFrom:string;internalRate:number;interstate:Partial<Record<Uf,number>>;exceptions?:IcmsException[];savedBy:string;savedAt:string};

const rate=z.number().min(0,'A alíquota não pode ser negativa.').max(100,'A alíquota deve ser de no máximo 100%.').refine(v=>Math.abs(v*100-Math.round(v*100))<1e-6,'Use até duas casas decimais.');
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Informe a data inicial da vigência.').refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Data inválida');
export const icmsTableSchema=z.object({
  validFrom:day,
  internalRate:rate,
  interstate:z.record(z.string(),rate).refine(v=>Object.keys(v).every(k=>isUf(k)&&k!=='AM'),'Use apenas UFs de origem (fora do Amazonas).').refine(v=>Object.keys(v).length>0,'Informe ao menos uma alíquota interestadual.'),
  exceptions:z.array(z.object({label:z.string().trim().min(2,'Descreva a exceção.').max(80),rate})).max(10).refine(e=>new Set(e.map(x=>x.label.toLowerCase())).size===e.length,'Cada exceção uma única vez.').default([]),
});
// Somente o Master: chave liga/desliga e, opcionalmente, a tabela de uma vigência (substitui a
// tabela da mesma data inicial; as demais vigências ficam preservadas).
export const icmsSettingsSchema=z.object({enabled:z.boolean(),table:icmsTableSchema.optional()});

// Tabela vigente na data (Manaus): a de maior data inicial até a data.
export function currentIcmsTable(tables:IcmsTable[]|undefined,today:string):IcmsTable|undefined{
  return [...(tables||[])].filter(t=>t.validFrom<=today).sort((a,b)=>b.validFrom.localeCompare(a.validFrom))[0];
}
export const icmsRateLabel=(p:number)=>p.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
export const icmsTableLabel=(t:Pick<IcmsTable,'validFrom'|'internalRate'>)=>`tabela vigente desde ${t.validFrom.split('-').reverse().join('/')} (interna AM ${icmsRateLabel(t.internalRate)})`;

// UF de origem trazida pela pesquisa (opcional na evidência: analysis.originState e
// analysis.originStateQuote). Comprovada só quando o trecho está literalmente na página e
// cita a UF ou o nome do estado; sem trecho, a UF vale como a conferir. Ponte que não envia
// UF continua compatível: a origem fica não identificada (a conferir).
const compact=(v:unknown)=>String(v||'').replace(/\s+/g,' ').trim();
const plain=(v:string)=>v.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
export function researchOriginState(page:{text?:string;analysis?:unknown}|undefined):{uf:Uf;verified:boolean}|undefined{
  const a=page?.analysis as {originState?:unknown;originStateQuote?:unknown}|undefined;
  const uf=typeof a?.originState==='string'?a.originState.trim().toUpperCase():'';
  if(!isUf(uf))return undefined;
  const quote=typeof a?.originStateQuote==='string'?compact(a.originStateQuote):'';
  const verified=quote.length>=3&&quote.length<=2000&&compact(page?.text).includes(quote)&&(new RegExp('(?<![A-Za-z])'+uf+'(?![A-Za-z])').test(quote)||plain(quote).includes(plain(brazilStates[uf])));
  return {uf,verified};
}
