// Ticket 05 (E1): marca "a conferir". Preço achado na página com comprovação incompleta
// chega ao Site com o motivo, aparece destacado na revisão, é aceito com um clique (origem
// aceito, autoria/data no histórico) ou substituído por valor manual; enquanto houver a
// conferir não aceito, o envio à Diretoria Geral é recusado. Mesma regra na ponte e no Site.
// Rota real + ponte simulada no D1 local (Miniflare), sem busca, WhatsApp ou mensagem real.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {budgetFixture} from './budget-fixture.mjs';
import {classifyEvidence} from '../integrations/openclaw/price-evidence.mjs';
import {executeJob} from '../integrations/openclaw/client.mjs';
const bindings={name:'test-bindings',setup(b){
 b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'test'}));
 b.onResolve({filter:/local-session$/},()=>({path:'session',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='bindings'?'export const env=globalThis.checkTestEnv;':'export const currentLocalUser=async()=>globalThis.checkTestUser;',loader:'js'}));
}};
await build({entryPoints:['app/api/data/route.ts'],outfile:'outputs/estimate-to-check-route.mjs',bundle:true,platform:'node',format:'esm',plugins:[bindings]});
await build({stdin:{contents:"export * from './lib/integrations';export {transition} from './app/workflow';",resolveDir:process.cwd()},outfile:'outputs/estimate-to-check-api.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/estimate-to-check-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
await build({entryPoints:['app/budget-record-panel.tsx'],outfile:'outputs/estimate-to-check-record.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const api=await import('../outputs/estimate-to-check-api.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/estimate-to-check-panel.mjs?'+Date.now());
const {BudgetRecordPanel}=await import('../outputs/estimate-to-check-record.mjs?'+Date.now());

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
const later=(at,minutes)=>new Date(Date.parse(at)+minutes*60000).toISOString();
try{
 const db=await mf.getD1Database('DB'),now='2026-11-25T12:00:00.000Z';
 const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({minQuotes:1,holidays:[],departments:['Administrativo']})).run();
 globalThis.checkTestEnv={DB:db,WHATSAPP_SEND_ENABLED:'false'};
 const adm={id:'adm',name:'TESTE ADM',role:'administrativo'};globalThis.checkTestUser=adm;
 const route=await import('../outputs/estimate-to-check-route.mjs?'+Date.now());
 const post=body=>route.POST(new Request('https://example.com/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const read=async id=>(await api.rows(db,'request')).find(r=>r.id===id);
 const claim=async at=>api.claimJob(db,{},at,false,'criteria-v1');

 const items=[{name:'Assento sanitário Alfa',spec:'Branco',unit:'un',quantity:5},{name:'Torneira Beta',spec:'Metal',unit:'un',quantity:2},{name:'Peça rara Ômega',spec:'Cinza',unit:'un',quantity:3}];
 const page={url:'https://example.com/p',title:'Página fictícia',text:'Produto fictício. Preço R$ 129,90. Por unidade.'};
 const verified={status:'verified',sourceUrl:page.url,productName:'Produto fictício',productQuote:'Produto fictício.',priceAmount:129.9,currency:'BRL',priceType:'total',priceQuote:'Preço R$ 129,90.',packageQuantity:1,unit:'un',unitQuote:'Por unidade.',itemMatches:true,unitMatches:true,reason:'Produto e unidade correspondem ao pedido.'};
 // Torneira: produto parecido, caixa com 2 (unidade diferente) — preço na página, comprovação incompleta.
 const similar={...verified,status:'to_check',itemMatches:false,unitMatches:false,unit:'cx',packageQuantity:2,unitQuote:'Caixa com 2',reason:'Modelo parecido; vendido em caixa com 2.'};
 const result=(job,analysis)=>({jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[{title:page.title,url:page.url,description:''}],analysisReason:analysis.reason,priceEvidence:{origin:'public',...page,analysis}});
 const noPrice=job=>({jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[{title:'Outra',url:'https://example.com/o',description:''}],analysisReason:'Nenhuma página mostra preço por unidade.'});

 // Regra idêntica: a ponte encaminha o que a regra não marca como pendência; o Site decide de novo.
 for(const [analysis,outcome] of [[verified,'verified'],[similar,'to_check'],[{...similar,priceAmount:99},'pending']]){
  assert.equal(classifyEvidence(items[1],{...page,analysis}).outcome,outcome);
  const bridged=await executeJob({gateway:'http://127.0.0.1:18789',gatewayToken:'test',canSend:false},{id:'b',leaseToken:'l',type:'estimate_search',query:'q',item:items[1]},async(_u,o)=>{const b=JSON.parse(o.body);return Response.json({ok:true,result:{details:b.tool==='web_search'?{results:[{title:page.title,url:page.url,description:''}]}:page}})},async()=>analysis);
  assert.equal(!!bridged.priceEvidence,outcome!=='pending','ponte: '+outcome);
 }

 // Primeira saída de Estimativa: comprovado, a conferir e pendência.
 await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind('check','request',JSON.stringify({...budgetFixture('monthly'),id:'check',code:'CE-CHECK',department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'estimating',version:1,items,quotes:[],createdAt:now,updatedAt:now})).run();
 await api.tick(db,{},now);
 const jobs=[await claim(now),await claim(now),await claim(now)].sort((a,b)=>a.itemIndex-b.itemIndex);
 await api.completeJob(db,result(jobs[0],verified),now);
 await api.completeJob(db,result(jobs[1],similar),now);
 // Preço que não aparece na página: o Site não guarda a evidência (vira pendência).
 await api.completeJob(db,result(jobs[2],{...similar,priceAmount:99}),now);
 const stored=(await api.rows(db,'integration_job')).find(j=>j.id===jobs[2].id);
 assert.equal(stored.priceEvidence,undefined,'evidência sem preço utilizável descartada no Site');
 let saved=await read('check');
 assert.equal(saved.status,'admin_review');
 let products=saved.estimate.lines.filter(l=>l.kind==='product');
 assert.deepEqual(products.map(l=>[l.itemIndex,l.origin,l.value]),[[0,'automatic',129.9],[1,'to_check',64.95],[2,'pending',null]]);
 assert.match(products[1].reason,/A conferir: produto parecido[\s\S]*unidade[\s\S]*Modelo parecido/,'a conferir chega com o motivo');
 assert.equal(products[1].sourceUrl,page.url);assert.equal(products[1].author,'Sistema');
 assert.equal(products[0].reason,undefined,'comprovado sem motivo');
 assert.equal(saved.estimate.total,779.4,'a conferir entra no total: 649,50 + 129,90');
 assert.match(saved.estimate.notes,/a conferir/);

 // Pendência resolvida manualmente; resta o a conferir.
 let response=await post({action:'estimate_item',id:'check',version:saved.version,entries:[{itemIndex:2,unitPrice:40,sourceName:'Loja manual fictícia',sourceUrl:'https://example.com/manual',researchedOn:'2026-11-26'}]});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('check');

 // Envio à DG recusado com a conferir não aceito (servidor), nos dois caminhos.
 const me={role:'administrativo',name:'TESTE ADM'};
 assert.throws(()=>api.transition(saved,{action:'budget_management',submitToGeneral:true,data:{}},me,[],{},now),/a conferir/i);
 assert.throws(()=>api.transition({...saved,form:undefined},{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now),/a conferir/i);
 assert.throws(()=>api.transition({...saved,status:'general_review',adminReview:'ok',form:undefined},{action:'approve',reason:'Aprovado pela DG.'},{role:'geral',name:'DG'},[],{},now),/a conferir/i);
 response=await post({action:'budget_management',id:'check',version:saved.version,data:{},submitToGeneral:true});
 assert.equal(response.status,409);assert.match((await response.json()).error,/a conferir/i);

 // Interface: a conferir destacado com motivo, aceitar com um clique, substituir por manual; envio bloqueado.
 const data=role=>({me:{id:role,name:role,email:'',role,department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings:{name:'Colégio Estrelas',legalName:'CEEA',minQuotes:3,departments:['Administrativo']}});
 let html=renderToStaticMarkup(createElement(Panel,{request:saved,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/class="[^"]*estimate-to-check[^"]*"[\s\S]*?A conferir[\s\S]*?Torneira Beta/,'a conferir destacado');
 assert.match(html,/Modelo parecido; vendido em caixa com 2\./,'motivo visível');
 assert.match(html,/Aceitar valor de Torneira Beta/,'aceitar com um clique');
 assert.match(html,/Substituir por valor manual/,'substituir por manual');
 assert.doesNotMatch(html,/Aceitar valor de (Assento|Peça)/,'aceite só no a conferir');
 html=renderToStaticMarkup(createElement(BudgetRecordPanel,{request:saved,data:data('administrativo'),busy:false,onSave:async()=>true,estimates:null}));
 assert.match(html,/<button[^>]*value="send_general"[^>]*disabled=""/,'envio bloqueado na interface');
 assert.match(html,/a conferir/i);

 // Aceitar: permissões, etapa, versão e item a conferir.
 globalThis.checkTestUser={id:'dg',name:'TESTE DG',role:'geral'};
 assert.equal((await post({action:'accept_estimate_item',id:'check',version:saved.version,itemIndex:1})).status,403,'DG não aceita');
 globalThis.checkTestUser={id:'setor',name:'TESTE Setor',role:'solicitante'};
 assert.equal((await post({action:'accept_estimate_item',id:'check',version:saved.version,itemIndex:1})).status,403,'setor não aceita');
 globalThis.checkTestUser=adm;
 assert.equal((await post({action:'accept_estimate_item',id:'check',version:saved.version,itemIndex:0})).status,409,'automático não é aceito');
 assert.equal((await post({action:'accept_estimate_item',id:'check',version:saved.version,itemIndex:2})).status,409,'manual não é aceito');
 assert.equal((await post({action:'accept_estimate_item',id:'check',version:saved.version,itemIndex:9})).status,400,'item inexistente');
 assert.equal((await post({action:'accept_estimate_item',id:'check',version:saved.version-1,itemIndex:1})).status,409,'versão antiga');
 const beforeAccept=saved;
 response=await post({action:'accept_estimate_item',id:'check',version:saved.version,itemIndex:1});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('check');
 assert.equal(saved.status,'admin_review');
 const accepted=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1);
 assert.deepEqual([accepted.origin,accepted.value,accepted.author,accepted.sourceUrl],['accepted',64.95,'TESTE ADM',page.url]);
 assert.match(accepted.at,/^\d{4}-\d{2}-\d{2}T/);assert.notEqual(accepted.at,products[1].at);
 assert.match(accepted.reason,/Modelo parecido/,'motivo preservado');
 const h=saved.estimateEditHistory.at(-1);
 assert.deepEqual([h.action,h.itemIndex,h.actor,h.previous.origin,h.line.origin],['accept',1,'TESTE ADM','to_check','accepted']);assert.ok(h.at);
 assert.equal(saved.estimate.total,beforeAccept.estimate.total,'aceitar não muda o valor');
 const audit=await db.prepare("SELECT action FROM audit WHERE entity='check'").all();
 assert.ok(audit.results.some(a=>/aceit[\s\S]*Torneira Beta/i.test(a.action)),'auditoria registra o aceite');
 assert.equal((await post({action:'accept_estimate_item',id:'check',version:saved.version,itemIndex:1})).status,409,'aceito não é aceito de novo');
 // Aceito permanece: não é substituído pelo preenchimento manual.
 assert.equal((await post({action:'estimate_item',id:'check',version:saved.version,entries:[{itemIndex:1,unitPrice:10,sourceName:'Loja',sourceUrl:'https://example.com/x',researchedOn:'2026-11-26'}]})).status,409);
 // Sem a conferir: envio liberado.
 assert.doesNotThrow(()=>api.transition({...saved,form:undefined},{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now));
 assert.throws(()=>api.transition(saved,{action:'budget_management',submitToGeneral:true,data:{}},me,[],{},now),e=>!/a conferir|pendência de estimativa/i.test(e.message),'só a conferência de quantidades resta no formulário');
 html=renderToStaticMarkup(createElement(BudgetRecordPanel,{request:saved,data:data('administrativo'),busy:false,onSave:async()=>true,estimates:null}));
 assert.doesNotMatch(html,/<button[^>]*value="send_general"[^>]*disabled=""/,'envio liberado após aceitar');
 html=renderToStaticMarkup(createElement(Panel,{request:saved,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/valor a conferir aceito/,'histórico mostra o aceite');
 // DG vê a origem aceita com autoria, sem ações.
 html=renderToStaticMarkup(createElement(Panel,{request:{...saved,status:'general_review'},data:data('geral'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Torneira Beta: R\$\s64,95 \/ un[\s\S]*?Aceito · TESTE ADM/);
 assert.doesNotMatch(html,/Aceitar valor/);

 // Fora da revisão da estimativa a ação não existe.
 await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind('dg-stage','request',JSON.stringify({...beforeAccept,id:'dg-stage',version:1,status:'general_review',adminReview:'ok'})).run();
 assert.equal((await post({action:'accept_estimate_item',id:'dg-stage',version:1,itemIndex:1})).status,400);

 // Substituir um a conferir por valor manual (ticket 03) e nova busca do item com resultado a conferir (ticket 04).
 await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind('swap','request',JSON.stringify({...beforeAccept,id:'swap',code:'CE-SWAP',version:1,estimateEditHistory:[]})).run();
 response=await post({action:'estimate_item',id:'swap',version:1,entries:[{itemIndex:1,unitPrice:70,sourceName:'Loja manual fictícia',sourceUrl:'https://example.com/m',researchedOn:'2026-11-26'}]});
 assert.equal(response.status,200,await response.clone().text());
 let swap=await read('swap');
 assert.equal(swap.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1).origin,'manual');
 assert.equal(swap.estimateEditHistory.at(-1).previous.origin,'to_check');
 response=await post({action:'research_item',id:'swap',version:swap.version,itemIndex:0,criteria:{searchName:'Assento Alfa',minimumRequirements:'Branco',allowSimilar:true,brandPolicy:'reference',brandModel:''}});
 assert.equal(response.status,200,await response.clone().text());
 const t1=new Date(Date.now()+60000).toISOString();let redo;
 for(;;){const j=await claim(t1);assert.ok(j);if(j.requestId==='swap'){redo=j;break}}
 await api.completeJob(db,result(redo,{...similar,unit:'un',unitMatches:true,unitQuote:'Por unidade.',packageQuantity:1}),later(t1,1));
 swap=await read('swap');
 const redone=swap.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===0);
 assert.deepEqual([redone.origin,redone.value,redone.searchRevision],['to_check',129.9,undefined],'nova busca também devolve a conferir');
 assert.match(redone.reason,/produto parecido/);
 assert.equal(swap.estimateEditHistory.at(-1).action,'research_result');
 assert.throws(()=>api.transition(swap,{action:'budget_management',submitToGeneral:true,data:{}},me,[],{},now),/a conferir/i);
 console.log('PASS: a conferir com motivo (ponte e Site), destaque, aceite com autoria, substituição manual, nova busca e bloqueio do envio à DG.');
}finally{await mf.dispose();delete globalThis.checkTestEnv;delete globalThis.checkTestUser}
