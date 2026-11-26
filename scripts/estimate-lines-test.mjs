// Ticket 01 (E1): a estimativa é lida por item, com linhas de produto, frete e ICMS.
// Cada formato antigo gravado no banco precisa continuar lido sem migração, com o
// mesmo total e a mesma exibição no painel da Diretoria Administrativa e da Diretoria Geral.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await build({entryPoints:['app/estimate-lines.ts'],outfile:'outputs/estimate-lines-test.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/estimate-lines-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const {readEstimate,estimateLinesTotal,estimateFromLines,reduceEstimate,estimatePendingMessage}=await import('../outputs/estimate-lines-test.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/estimate-lines-panel.mjs?'+Date.now());

const items=[{name:'Monitor Rhadium',unit:'un.',quantity:5,spec:'19 polegadas'},{name:'Kit CCI20',unit:'kit',quantity:3,spec:'Com fio'}];
const references=[{unitPrice:410.9,sourceUrl:'https://example.com/monitor',sourceName:'Loja Monitor',researchedOn:'2026-11-12'},{unitPrice:76.55,sourceUrl:'https://example.com/kit',sourceName:'Loja Kit',researchedOn:'2026-11-11'}];
const recordedAt='2026-11-12T22:46:00.000Z';
const formats={
 // Projeção automática (lib/integrations.ts): frete não apurado, fora do total.
 automatic:{references,freight:0,freightKnown:false,notes:'Estimativa preenchida pelo agente de pesquisa do OpenClaw.',total:2284.15,recordedAt,method:'automatic'},
 // Estimativa manual tudo ou nada com frete informado.
 manualFreight:{references,freight:35.5,freightKnown:true,notes:'Referências conferidas pela administração.',total:2319.65,recordedAt,method:'manual'},
 // Estimativa manual com a opção "Frete ainda não apurado".
 manualUnknownFreight:{references,freight:0,freightKnown:false,notes:'Frete a confirmar com a loja.',total:2284.15,recordedAt,method:'manual'},
 // Registros mais antigos, sem freightKnown nem method: frete conhecido e exibidos como manuais.
 oldest:{references,freight:20,notes:'Registro do fluxo anterior.',total:2304.15,recordedAt},
};

for(const [name,estimate] of Object.entries(formats)){
 const before=JSON.stringify(estimate),request={id:name,status:'admin_review',items,quotes:[],estimate};
 const view=readEstimate(request);
 assert.equal(JSON.stringify(estimate),before,name+': leitura não altera o registro gravado');
 assert.equal(view.format,'legacy',name);
 assert.equal(view.total,estimate.total,name+': total exibido continua o gravado');
 assert.equal(estimateLinesTotal(view.lines,items),estimate.total,name+': linhas reproduzem o total antigo');
 const products=view.lines.filter(l=>l.kind==='product');
 assert.equal(products.length,items.length,name+': uma linha de produto por item');
 const origin=estimate.method==='automatic'?'automatic':'manual';
 products.forEach((l,i)=>{
  assert.equal(l.itemIndex,i);assert.equal(l.value,references[i].unitPrice);assert.equal(l.origin,origin);
  assert.equal(l.sourceName,references[i].sourceName);assert.equal(l.sourceUrl,references[i].sourceUrl);assert.equal(l.researchedOn,references[i].researchedOn);
  assert.equal(l.at,recordedAt);assert.equal(l.author,estimate.method==='automatic'?'Sistema':undefined,'autor manual antigo não foi registrado');
 });
 const freight=view.lines.filter(l=>l.kind==='freight');
 assert.equal(freight.length,1,name+': frete antigo é uma linha única da solicitação');
 assert.equal(freight[0].itemIndex,undefined);
 if(estimate.freightKnown===false){assert.equal(freight[0].value,null);assert.equal(freight[0].origin,'pending');assert.equal(view.freightKnown,false)}
 else{assert.equal(freight[0].value,estimate.freight);assert.equal(freight[0].origin,'manual');assert.equal(view.freightKnown,true)}
 assert.equal(view.lines.some(l=>l.kind==='icms'),false,name+': formato antigo não tinha ICMS');
 assert.equal(view.method,estimate.method==='automatic'?'automatic':'manual');
 assert.equal(view.notes,estimate.notes);

 for(const role of ['administrativo','geral']){
  const html=renderToStaticMarkup(createElement(Panel,{request,data:{me:{role},integrations:{jobs:[]},suppliers:[]},busy:false,onSave:async()=>true,onDecision:()=>{}}));
  const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
  assert(html.includes(brl(estimate.total)),name+'/'+role+': total');
  assert(html.includes(estimate.freightKnown===false?'Frete não apurado — não incluído no total':'Inclui frete estimado de '+brl(estimate.freight)),name+'/'+role+': frete');
  assert(html.includes('Monitor Rhadium: '+brl(410.9)+' / un.')&&html.includes('Kit CCI20: '+brl(76.55)+' / kit'),name+'/'+role+': fontes por item');
  assert(html.includes('Consulta em 12/11/2026')&&html.includes('Loja Kit ↗'),name+'/'+role+': data e fonte');
  assert(html.includes(estimate.method==='automatic'?'Referências preenchidas automaticamente':'Referências registradas manualmente.'),name+'/'+role+': origem');
 }
}

// Escopo reduzido pela Diretoria Geral (budget-workflow): referências e total recalculados no próprio registro.
const reduced={...formats.manualFreight,references:[references[1]],total:265.15};
const reducedView=readEstimate({id:'reduced',status:'quoting',items:[{...items[1],quantity:3}],quotes:[],estimate:reduced});
assert.equal(reducedView.total,265.15);assert.equal(estimateLinesTotal(reducedView.lines,[{...items[1],quantity:3}]),265.15);
assert.equal(reducedView.lines.filter(l=>l.kind==='product').length,1);

assert.equal(readEstimate({id:'none',status:'pending',items,quotes:[]}),undefined,'sem estimativa continua sem estimativa');

// Formato novo por item: a linha a conferir conta no total; pendência e "aguardando contador" não somam valor.
const now='2026-11-26T12:00:00.000Z';
const lines=[
 {kind:'product',itemIndex:0,value:410.9,origin:'automatic',sourceName:'Loja Monitor',sourceUrl:'https://example.com/monitor',researchedOn:'2026-11-26',author:'Sistema',at:now},
 {kind:'freight',itemIndex:0,value:25,origin:'to_check',sourceName:'Percentual padrão',author:'Sistema',at:now},
 {kind:'icms',itemIndex:0,value:null,origin:'awaiting_accountant',author:'Sistema',at:now},
 {kind:'product',itemIndex:1,value:null,origin:'pending',reason:'Nenhuma página com preço.',author:'Sistema',at:now},
 {kind:'freight',itemIndex:1,value:null,origin:'pending',author:'Sistema',at:now},
 {kind:'icms',itemIndex:1,value:null,origin:'awaiting_accountant',author:'Sistema',at:now},
];
const view=readEstimate({id:'new',status:'admin_review',items,quotes:[],estimate:{lines,notes:'Nova estimativa.',recordedAt:now,method:'automatic',total:0}});
assert.equal(view.format,'items-v1');assert.equal(view.total,2079.5);assert.equal(view.lines.length,6);
// Redução de escopo no formato novo: só os itens escolhidos, renumerados, com campos antigos coerentes.
const full=estimateFromLines([lines[0],{...lines[3],value:76.55,origin:'manual',sourceName:'Loja Kit',sourceUrl:'https://example.com/kit',researchedOn:'2026-11-26'},{kind:'freight',value:10,origin:'manual',at:now}],items,{notes:'n',recordedAt:now,method:'automatic'});
assert.equal(full.total,2294.15);assert.deepEqual(full.references.map(r=>r.unitPrice),[410.9,76.55]);assert.equal(estimatePendingMessage({items,estimate:full}),undefined);
const cut=reduceEstimate(full,[1],[{...items[1],quantity:2}],' reduzido');
assert.deepEqual(cut.lines.filter(l=>l.kind==='product').map(l=>[l.itemIndex,l.value]),[[0,76.55]]);assert.equal(cut.total,163.1);assert.deepEqual(cut.references.map(r=>r.unitPrice),[76.55]);
assert.match(estimatePendingMessage({items,estimate:estimateFromLines(lines,items,{notes:'n',recordedAt:now,method:'automatic'})}),/1 item/);
console.log('PASS: estimativa por item lê os formatos automático, manual, manual sem frete, antigo e reduzido, com total e exibição iguais.');
