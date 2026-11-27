// Ticket 03 (E1): na revisão da estimativa, a Diretoria Administrativa completa só os
// itens com pendência; os preços automáticos permanecem. Rota real com D1 local
// (Miniflare), sem ponte, busca, WhatsApp ou mensagem real.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {budgetFixture} from './budget-fixture.mjs';
const bindings={name:'test-bindings',setup(b){
 b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'test'}));
 b.onResolve({filter:/local-session$/},()=>({path:'session',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='bindings'?'export const env=globalThis.fillTestEnv;':'export const currentLocalUser=async()=>globalThis.fillTestUser;',loader:'js'}));
}};
await build({entryPoints:['app/api/data/route.ts'],outfile:'outputs/estimate-item-fill-route.mjs',bundle:true,platform:'node',format:'esm',plugins:[bindings]});
await build({stdin:{contents:"export {transition} from './app/workflow';export {rows} from './lib/integrations';",resolveDir:process.cwd()},outfile:'outputs/estimate-item-fill-api.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/estimate-item-fill-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
await build({entryPoints:['app/budget-record-panel.tsx'],outfile:'outputs/estimate-item-fill-record.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const {transition,rows}=await import('../outputs/estimate-item-fill-api.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/estimate-item-fill-panel.mjs?'+Date.now());
const {BudgetRecordPanel}=await import('../outputs/estimate-item-fill-record.mjs?'+Date.now());

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB'),now='2026-11-26T12:00:00.000Z';
 const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({minQuotes:1,holidays:[],departments:['Administrativo']})).run();
 globalThis.fillTestEnv={DB:db,WHATSAPP_SEND_ENABLED:'false'};
 const adm={id:'adm',name:'TESTE ADM',role:'administrativo'};globalThis.fillTestUser=adm;
 const route=await import('../outputs/estimate-item-fill-route.mjs?'+Date.now());
 const post=body=>route.POST(new Request('https://example.com/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const read=async id=>(await rows(db,'request')).find(r=>r.id===id);
 const put=r=>db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind(r.id,'request',JSON.stringify(r)).run();

 // 2 itens comprovados + 1 pendência, como a projeção automática do ticket 02 grava.
 const items=[{name:'Assento sanitário Alfa',spec:'Branco',unit:'un',quantity:5,category:'Manutenção'},{name:'Torneira Beta',spec:'Metal',unit:'un',quantity:2,category:'Manutenção'},{name:'Peça rara Ômega',spec:'Cinza',unit:'un',quantity:3,category:'Manutenção'}];
 const auto=(itemIndex,value)=>({kind:'product',itemIndex,value,origin:'automatic',sourceName:'Loja fictícia',sourceUrl:'https://example.com/p'+itemIndex,researchedOn:'2026-11-25',author:'Sistema',at:'2026-11-25T15:00:00.000Z'});
 const lines=[auto(0,100),auto(1,50),{kind:'product',itemIndex:2,value:null,origin:'pending',reason:'Nenhuma página mostra preço por unidade.',author:'Sistema',at:'2026-11-25T15:00:00.000Z'},{kind:'freight',value:null,origin:'pending',reason:'Frete não apurado — não incluído no total',author:'Sistema',at:'2026-11-25T15:00:00.000Z'}];
 const estimate={method:'automatic',notes:'Estimativa automática fictícia.',recordedAt:'2026-11-25T15:00:00.000Z',lines,total:600,freight:0,freightKnown:false,references:[]};
 const base={...budgetFixture('monthly'),id:'fill',code:'CE-FILL',authorId:'setor',authorName:'TESTE Setor',department:'Administrativo',version:1,status:'admin_review',quotes:[],items,estimate,createdAt:now,updatedAt:now};
 base.form={...base.form,fields:{...base.form.fields,referenceMonth:'2026-11'}};
 await put(base);
 const fill={itemIndex:2,unitPrice:40,sourceName:'Loja manual fictícia',sourceUrl:'https://example.com/manual',researchedOn:'2026-11-26'};

 // Preço manual exige fonte/link; preços automáticos não podem ser substituídos por esta ação.
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[{...fill,sourceUrl:''}]})).status,400,'link da fonte obrigatório');
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[{...fill,sourceName:''}]})).status,400,'fonte obrigatória');
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[{...fill,researchedOn:'2026-12-30'}]})).status,400,'data futura recusada');
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[{...fill,itemIndex:0}]})).status,409,'preço automático permanece');
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[{...fill,itemIndex:7}]})).status,400,'item inexistente');
 // A estimativa manual tudo ou nada não substitui mais uma estimativa por item.
 const legacyBody={action:'estimate',id:'fill',version:1,data:{references:items.map(()=>({unitPrice:1,sourceName:'Fonte',sourceUrl:'https://example.com/x',researchedOn:'2026-11-26'})),freight:0,notes:'Tentativa de substituir tudo.'}};
 assert.equal((await post(legacyBody)).status,409,'formulário tudo ou nada recusado sobre estimativa por item');
 globalThis.fillTestUser={id:'setor',name:'TESTE Setor',role:'solicitante'};
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[fill]})).status,403,'setor não preenche estimativa');
 globalThis.fillTestUser={id:'dg',name:'TESTE DG',role:'geral'};
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[fill]})).status,403,'Diretoria Geral não preenche estimativa');
 globalThis.fillTestUser=adm;
 assert.equal((await read('fill')).version,1,'recusas não gravam');

 // Preenche só o pendente.
 let response=await post({action:'estimate_item',id:'fill',version:1,entries:[fill]});
 assert.equal(response.status,200,await response.clone().text());
 let saved=await read('fill');
 assert.equal(saved.status,'admin_review','continua na revisão da estimativa');assert.equal(saved.version,2);
 const products=saved.estimate.lines.filter(l=>l.kind==='product');
 assert.deepEqual(products.map(l=>[l.itemIndex,l.origin,l.value]),[[0,'automatic',100],[1,'automatic',50],[2,'manual',40]]);
 assert.deepEqual(products.slice(0,2),lines.slice(0,2),'linhas automáticas intactas');
 assert.equal(products[2].sourceUrl,fill.sourceUrl);assert.equal(products[2].sourceName,fill.sourceName);assert.equal(products[2].researchedOn,'2026-11-26');
 assert.equal(products[2].author,'TESTE ADM');assert.match(products[2].at,/^\d{4}-\d{2}-\d{2}T/);
 assert.equal(saved.estimate.total,720,'total recomposto: 500 + 100 + 120');
 assert.deepEqual(saved.estimate.references.map(r=>r.unitPrice),[100,50,40],'campos antigos coerentes sem pendência');
 assert.equal(saved.estimate.method,'automatic');assert.equal(saved.estimate.recordedAt,estimate.recordedAt);
 assert.equal(saved.estimateEditHistory.length,1);
 assert.equal(saved.estimateEditHistory[0].itemIndex,2);assert.equal(saved.estimateEditHistory[0].actor,'TESTE ADM');assert.ok(saved.estimateEditHistory[0].at);
 assert.equal(saved.estimateEditHistory[0].previous.origin,'pending');assert.equal(saved.estimateEditHistory[0].line.value,40);
 const audit=await db.prepare("SELECT action FROM audit WHERE entity='fill'").all();
 assert.ok(audit.results.some(a=>/Peça rara Ômega/.test(a.action)),'auditoria registra o item preenchido');

 // Controle de versão: versão antiga recusada.
 assert.equal((await post({action:'estimate_item',id:'fill',version:1,entries:[{...fill,unitPrice:45}]})).status,409,'versão antiga');
 // Correção do valor manual também entra no histórico.
 assert.equal((await post({action:'estimate_item',id:'fill',version:2,entries:[{...fill,unitPrice:45}]})).status,200,'corrige valor manual');
 saved=await read('fill');assert.equal(saved.estimateEditHistory.length,2);assert.equal(saved.estimateEditHistory[1].previous.value,40);assert.equal(saved.estimate.total,735);

 // Fora da revisão da estimativa a ação não existe.
 await put({...base,id:'dg-stage',status:'general_review',adminReview:'ok'});
 assert.equal((await post({action:'estimate_item',id:'dg-stage',version:1,entries:[fill]})).status,400,'Diretoria Geral já decide');
 // Mês fechado: recusa sem gravar.
 await put({...base,id:'closed-month',form:{...base.form,fields:{...base.form.fields,referenceMonth:'2026-10'}}});
 await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind('closing-10','budget_closing',JSON.stringify({month:'2026-10',status:'Concluído'})).run();
 response=await post({action:'estimate_item',id:'closed-month',version:1,entries:[fill]});
 assert.ok(response.status>=400,'mês fechado recusado');assert.match((await response.json()).error,/fechad|fechamento/i);
 assert.equal((await read('closed-month')).version,1);
 // Arquivada: recusa.
 await put({...base,id:'archived',archived:{actor:'Master',at:now,reason:'Arquivada de teste'}});
 assert.equal((await post({action:'estimate_item',id:'archived',version:1,entries:[fill]})).status,409);

 // Envio à DG: bloqueado com pendência, liberado depois do preenchimento; contrato antigo aceito sem linhas.
 const me={role:'administrativo',name:'TESTE ADM'};
 assert.throws(()=>transition({...base,form:undefined},{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now),/pendência de estimativa/i);
 assert.throws(()=>transition({...saved,form:undefined},{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now),/frete pendente/i,'ticket 06: frete também é exigido');
 const freightDone=r=>({...r,estimate:{...r.estimate,lines:r.estimate.lines.map(l=>l.kind==='freight'?{...l,value:0,origin:'manual'}:l)}});
 assert.doesNotThrow(()=>transition(freightDone({...saved,form:undefined}),{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now));
 const legacy=transition({...base,estimate:undefined,status:'estimating'},legacyBody,me,[],{},now);
 assert.equal(legacy.data.estimate.method,'manual');assert.equal(legacy.data.estimate.lines,undefined,'estimativa manual completa continua no formato antigo');

 // Interface da revisão: formulário só no item pendente; envio liberado quando completo.
 const data=role=>({me:{id:role,name:role,email:'',role,department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings:{name:'Colégio Estrelas',legalName:'CEEA',minQuotes:3,departments:['Administrativo']}});
 let html=renderToStaticMarkup(createElement(Panel,{request:base,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Informar preço de Peça rara Ômega/,'formulário do item pendente');
 assert.doesNotMatch(html,/Informar preço de (Assento|Torneira)/,'sem formulário nos itens automáticos');
 assert.doesNotMatch(html,/Revisar estimativa preenchida/,'formulário tudo ou nada fora da revisão por item');
 assert.match(html,/name="url2"[^>]*required|required[^>]*name="url2"/,'link obrigatório');
 html=renderToStaticMarkup(createElement(BudgetRecordPanel,{request:base,data:data('administrativo'),busy:false,onSave:async()=>true,estimates:null}));
 assert.match(html,/<button[^>]*value="send_general"[^>]*disabled=""/,'envio bloqueado com pendência');
 html=renderToStaticMarkup(createElement(BudgetRecordPanel,{request:freightDone(saved),data:data('administrativo'),busy:false,onSave:async()=>true,estimates:null}));
 assert.doesNotMatch(html,/<button[^>]*value="send_general"[^>]*disabled=""/,'envio liberado com todos os itens valorados (e frete informado, ticket 06)');
 html=renderToStaticMarkup(createElement(Panel,{request:saved,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Corrigir preço manual de Peça rara Ômega/,'valor manual pode ser corrigido');
 assert.match(html,/Histórico do preenchimento/);assert.match(html,/TESTE ADM/);
 // A Diretoria Geral vê a origem de cada valor, sem formulário.
 html=renderToStaticMarkup(createElement(Panel,{request:{...saved,status:'general_review'},data:data('geral'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Assento sanitário Alfa: R\$\s100,00 \/ un[\s\S]*?Automático/,'origem automática visível');
 assert.match(html,/Peça rara Ômega: R\$\s45,00 \/ un[\s\S]*?Manual · TESTE ADM/,'origem manual com autoria visível');
 assert.doesNotMatch(html,/Informar preço|Corrigir preço/,'DG não edita');
 console.log('PASS: completar só a pendência, origem manual com fonte, automáticos preservados, histórico, versão, mês fechado, envio à DG e interface.');
}finally{await mf.dispose();delete globalThis.fillTestEnv;delete globalThis.fillTestUser}
