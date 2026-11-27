// Ticket 07 (E1): frete da loja até o CEP comercial da escola. O CEP 69086-665 é constante
// do sistema (não é mais editável); a tarefa de pesquisa leva CEP e quantidade à ponte; o
// frete exibido pela loja do preço vira a linha de frete do item (comprovado, grátis = 0
// comprovado, aproximado = a conferir); sem frete da loja, percentual a conferir; sem
// percentual, pendente. Ponte antiga continua funcionando. Rota real + ponte simulada no D1
// local (Miniflare), sem busca, navegador, WhatsApp ou mensagem real.
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
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='bindings'?'export const env=globalThis.storeFreightEnv;':'export const currentLocalUser=async()=>globalThis.storeFreightUser;',loader:'js'}));
}};
await build({entryPoints:['app/api/data/route.ts'],outfile:'outputs/store-freight-route.mjs',bundle:true,platform:'node',format:'esm',plugins:[bindings]});
await build({stdin:{contents:"export * from './lib/integrations';export {transition} from './app/workflow';export * from './app/estimate-lines';export * from './app/school-destination';",resolveDir:process.cwd()},outfile:'outputs/store-freight-api.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/store-freight-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
await build({entryPoints:['app/estimate-settings-panel.tsx'],outfile:'outputs/store-freight-settings.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const api=await import('../outputs/store-freight-api.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/store-freight-panel.mjs?'+Date.now());
const {default:SettingsPanel}=await import('../outputs/store-freight-settings.mjs?'+Date.now());

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB'),now=new Date().toISOString();
 const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 // CEP salvo antes (ticket 06) fica preservado, sem uso.
 await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({name:'Colégio Estrelas',legalName:'CEEA',minQuotes:1,holidays:[],departments:['Administrativo'],schoolCep:'11111-111',estimateSettingsHistory:[{actor:'Master antigo',at:now,previous:{},next:{schoolCep:'11111-111'}}]})).run();
 globalThis.storeFreightEnv={DB:db,WHATSAPP_SEND_ENABLED:'false'};
 const master={id:'master',name:'TESTE Master',role:'admin',department:'Administrativo'},adm={id:'adm',name:'TESTE ADM',role:'administrativo',department:'Administrativo'};
 const as=u=>{globalThis.storeFreightUser=u};
 const route=await import('../outputs/store-freight-route.mjs?'+Date.now());
 const post=body=>route.POST(new Request('https://example.com/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const school=async()=>JSON.parse((await db.prepare('SELECT data FROM school WHERE id=1').first()).data);
 const read=async id=>(await api.rows(db,'request')).find(r=>r.id===id);
 const claim=async at=>api.claimJob(db,{},at,false,'criteria-v1');
 const items=[{name:'Assento sanitário Alfa',spec:'Branco',unit:'un',quantity:5},{name:'Torneira Beta',spec:'Metal',unit:'un',quantity:2}];
 const freightText={
  verified:q=>`Frete para o CEP 69086-665, quantidade ${q}: R$ 25,90`,
  free:q=>`Frete grátis para o CEP 69086-665, quantidade ${q}`,
  shown:()=>'Frete exibido: R$ 9,90; quantidade e destino precisam de conferência.'};
 const freightAnalysis={
  verified:q=>({status:'quoted',amount:25.9,quote:freightText.verified(q),cep:'69086-665',quantity:q}),
  free:q=>({status:'free',quote:freightText.free(q),cep:'69086-665',quantity:q}),
  shown:()=>({status:'quoted',amount:9.9,quote:freightText.shown()}),
  none:()=>({status:'not_shown'}),
  invalid:()=>({status:'quoted',amount:'muito',quote:12}),
  old:()=>undefined};
 // kinds: freight case per item index.
 const result=(job,kinds)=>{const kind=kinds[job.itemIndex],q=job.item.quantity,url='https://example.com/p'+job.itemIndex;
  const text='Produto fictício. Preço R$ 129,90. Por unidade.'+(freightText[kind]?'\n'+freightText[kind](q):'');
  const analysis={status:'verified',sourceUrl:url,productName:'Produto fictício',productQuote:'Produto fictício.',priceAmount:129.9,currency:'BRL',priceType:'total',priceQuote:'Preço R$ 129,90.',packageQuantity:1,unit:'un',unitQuote:'Por unidade.',itemMatches:true,unitMatches:true,reason:'Produto e unidade correspondem ao pedido.',...(freightAnalysis[kind]()!==undefined?{freight:freightAnalysis[kind](q)}:{})};
  return {jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[{title:'Loja '+job.itemIndex,url,description:''}],analysisReason:analysis.reason,priceEvidence:{origin:'authenticated_browser',url,title:'Loja '+job.itemIndex,text,analysis}};
 };
 const claimed=[];
 const estimateRequest=async(id,kinds)=>{
  await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind(id,'request',JSON.stringify({...budgetFixture('monthly'),id,code:'CE-'+id.toUpperCase(),department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'estimating',version:1,items,quotes:[],createdAt:now,updatedAt:now})).run();
  await api.tick(db,{},now);
  for(let j;(j=await claim(now));){claimed.push(j);const r=await api.completeJob(db,result(j,kinds),now);assert.equal(r.duplicate,false)}
  return read(id);
 };
 const freightOf=(r,i)=>r.estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===i);
 const send=r=>api.transition({...r,form:undefined},{action:'admin_review',reason:'Encaminho para decisão.'},{role:'administrativo',name:'TESTE ADM'},[],{},now);

 // 1. CEP constante do sistema; protocolo leva CEP e quantidade de cada item à ponte.
 assert.deepEqual(api.schoolFreightDestination,{cep:'69086-665',city:'Manaus',state:'AM'});
 let saved=await estimateRequest('store',['verified','free']);
 assert.deepEqual([...claimed].sort((a,b)=>a.itemIndex-b.itemIndex).map(j=>j.freightSimulation),[{cep:'69086-665',city:'Manaus',state:'AM',quantity:5},{cep:'69086-665',city:'Manaus',state:'AM',quantity:2}]);
 assert.equal(saved.status,'admin_review');
 // 2. Frete comprovado pela loja e frete grátis comprovado (= 0), sem percentual configurado.
 let f0=freightOf(saved,0),f1=freightOf(saved,1);
 assert.deepEqual([f0.origin,f0.value,f0.freightSource,f0.sourceUrl],['automatic',25.9,'store','https://example.com/p0']);
 assert.match(f0.reason,/simulado até o CEP 69086-665 para 5 un/);
 assert.deepEqual([f1.origin,f1.value,f1.freightSource],['automatic',0,'store']);
 assert.equal(saved.estimate.total,935.2,'649,50 + 259,80 + 25,90 + 0');
 assert.match(saved.estimate.notes,/CEP 69086-665/);
 assert.doesNotThrow(()=>send(saved),'frete comprovado libera o envio');

 // 3. Frete aproximado (sem destino confirmado) → a conferir com motivo; aceite com um clique.
 claimed.length=0;
 saved=await estimateRequest('approx',['shown','none']);
 f0=freightOf(saved,0);f1=freightOf(saved,1);
 assert.deepEqual([f0.origin,f0.value,f0.freightSource],['to_check',9.9,'store']);
 assert.match(f0.reason,/destino da simulação não confirmado no CEP da escola/);
 // Loja não exibiu frete e sem percentual: pendente com motivo.
 assert.deepEqual([f1.origin,f1.value],['pending',null]);assert.match(f1.reason,/Percentual padrão de frete não configurado/);
 assert.throws(()=>send(saved),/frete pendente em 1 item[\s\S]*1 frete a conferir/i);
 as(adm);
 let response=await post({action:'accept_estimate_item',kind:'freight',id:'approx',version:saved.version,itemIndex:0});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('approx');f0=freightOf(saved,0);
 assert.deepEqual([f0.origin,f0.value,f0.author,f0.freightSource],['accepted',9.9,'TESTE ADM','store']);

 // 4. Configuração: o Master edita só o percentual; CEP enviado é ignorado; CEP salvo antes preservado.
 as(master);
 response=await post({action:'estimate_settings',data:{schoolCep:'22222-222',freightPercent:10}});
 assert.equal(response.status,200,await response.clone().text());
 let s=await school();
 assert.deepEqual([s.schoolCep,s.freightPercent],['11111-111',10],'CEP salvo preservado e sem uso; percentual salvo');
 assert.equal(s.estimateSettingsHistory.length,2,'histórico anterior preservado');
 assert.deepEqual([s.estimateSettingsHistory[1].previous,s.estimateSettingsHistory[1].next],[{},{freightPercent:10}]);
 const data=(role,settings=s)=>({me:{id:role,name:role,email:'',role,department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings});
 let html=renderToStaticMarkup(createElement(SettingsPanel,{data:data('admin'),busy:false,onSave:async()=>true}));
 assert.doesNotMatch(html,/name="schoolCep"/,'CEP não é mais editável');
 assert.match(html,/69086-665/);assert.match(html,/Manaus\/AM/);assert.match(html,/Percentual padrão de frete[\s\S]*value="10"/);
 assert.match(html,/Histórico da configuração \(2\)/);assert.doesNotMatch(html,/22222-222/);

 // 5. Loja sem frete + percentual: a conferir com motivo "frete por percentual — loja não exibiu frete".
 // Ponte antiga (sem campo freight) e frete inválido têm o mesmo plano B, sem recusar o resultado.
 claimed.length=0;
 saved=await estimateRequest('fallback',['none','old']);
 for(const i of [0,1]){const f=freightOf(saved,i);assert.equal(f.origin,'to_check');assert.equal(f.freightSource,undefined);assert.match(f.reason,/Frete por percentual — loja não exibiu frete \(10% sobre o valor do produto\)/)}
 claimed.length=0;
 saved=await estimateRequest('invalid',['invalid','verified']);
 assert.equal(freightOf(saved,0).origin,'to_check','frete inválido descartado: percentual');assert.equal(freightOf(saved,1).origin,'automatic');
 // O agente não pode inventar o frete: valor fora da página não vale.
 const evidence=(await api.rows(db,'integration_job')).find(j=>j.requestId==='invalid'&&j.itemIndex===0).priceEvidence;
 assert.equal(evidence.analysis.freight,undefined,'frete fora do formato não é guardado');

 // 6. Pedidos existentes: frete aceito/manual por percentual não muda; refazer a busca traz o frete da loja.
 saved=await read('fallback');
 as(adm);
 response=await post({action:'accept_estimate_item',kind:'freight',id:'fallback',version:saved.version,itemIndex:0});assert.equal(response.status,200);
 saved=await read('fallback');
 response=await post({action:'estimate_freight',id:'fallback',version:saved.version,entries:[{itemIndex:1,value:7,sourceName:'Combinado por telefone'}]});assert.equal(response.status,200);
 saved=await read('fallback');
 await api.tick(db,{},now);
 const after=await read('fallback');
 assert.deepEqual([freightOf(after,0).origin,freightOf(after,0).value,freightOf(after,1).origin,freightOf(after,1).value],['accepted',64.95,'manual',7],'projeção não altera aceitos/manuais');
 const criteria={searchName:'Assento sanitário Alfa',minimumRequirements:'Branco',allowSimilar:false,brandPolicy:'reference',brandModel:''};
 for(const i of [0,1]){
  saved=await read('fallback');
  response=await post({action:'research_item',id:'fallback',version:saved.version,itemIndex:i,criteria:{...criteria,searchName:items[i].name}});
  assert.equal(response.status,200,await response.clone().text());
 }
 const later=new Date(Date.now()+1000).toISOString();let redone=0;
 for(let j;(j=await claim(later));){redone++;assert.deepEqual(j.freightSimulation?.cep,'69086-665');await api.completeJob(db,result(j,['verified','verified']),later)}
 assert.equal(redone,2,'duas novas buscas');
 saved=await read('fallback');
 f0=freightOf(saved,0);f1=freightOf(saved,1);
 assert.deepEqual([f0.origin,f0.value,f0.freightSource],['automatic',25.9,'store'],'nova busca traz o frete da loja');
 assert.deepEqual([f1.origin,f1.value],['manual',7],'frete manual permanece');
 assert.ok(saved.estimateEditHistory.some(h=>h.kind==='freight'&&h.action==='research_result'&&h.itemIndex===0),'histórico do frete da nova busca');
 // Preço do produto substituído por outra fonte: o frete da loja anterior sai; volta o percentual.
 const lines=saved.estimate.lines.map(l=>l.kind==='product'&&l.itemIndex===0?{...l,origin:'to_check',reason:'A conferir: teste'}:l);
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({...saved,estimate:{...saved.estimate,lines}}),'fallback').run();
 saved=await read('fallback');
 response=await post({action:'estimate_item',id:'fallback',version:saved.version,entries:[{itemIndex:0,unitPrice:100,sourceName:'Outra loja',sourceUrl:'https://example.com/outra',researchedOn:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date())}]});
 assert.equal(response.status,200,await response.clone().text());
 f0=freightOf(await read('fallback'),0);
 assert.deepEqual([f0.origin,f0.value,f0.freightSource],['to_check',50,undefined]);assert.match(f0.reason,/Frete por percentual — preço do produto informado manualmente/);

 // 7. Interface: frete comprovado da loja visível (sem formulário de preenchimento), link da loja, CEP somente leitura.
 saved=await read('store');
 html=renderToStaticMarkup(createElement(Panel,{request:saved,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Frete da loja: Assento sanitário Alfa/);assert.doesNotMatch(html,/Informar frete de Assento/);
 assert.match(html,/CEP 69086-665/);
 const toCheck={...saved,estimate:{...saved.estimate,lines:saved.estimate.lines.map(l=>l.kind==='freight'&&l.itemIndex===0?{...l,origin:'to_check',reason:'Frete da loja a conferir: teste.'}:l)}};
 html=renderToStaticMarkup(createElement(Panel,{request:toCheck,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Frete a conferir: Assento sanitário Alfa/);assert.match(html,/href="https:\/\/example.com\/p0"/);
 assert.doesNotMatch(html,/Calcular frete pelo percentual/,'frete da loja não oferece recálculo pelo percentual');
 console.log('PASS: CEP comercial constante, protocolo com CEP e quantidade, frete da loja comprovado/grátis/a conferir, percentual como plano B, pendente sem percentual, ponte antiga compatível, aceitos/manuais preservados e nova busca com frete da loja.');
}finally{await mf.dispose();delete globalThis.storeFreightEnv;delete globalThis.storeFreightUser}
