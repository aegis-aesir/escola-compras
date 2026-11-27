// Ticket 06 (E1): frete estimado por percentual. O Master (somente ele) configura o CEP
// comercial e o percentual padrão, com histórico; cada item da estimativa ganha a linha de
// frete calculada pelo percentual, a conferir; a Diretoria Administrativa aceita ou informa
// valor manual; total = produtos + frete (uma vez); envio à DG exige frete resolvido;
// assinaturas: não se aplica; estimativas antigas continuam lidas. Rota real + ponte
// simulada no D1 local (Miniflare), sem busca, WhatsApp ou mensagem real. CEP só de teste.
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
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='bindings'?'export const env=globalThis.freightTestEnv;':'export const currentLocalUser=async()=>globalThis.freightTestUser;',loader:'js'}));
}};
await build({entryPoints:['app/api/data/route.ts'],outfile:'outputs/estimate-freight-route.mjs',bundle:true,platform:'node',format:'esm',plugins:[bindings]});
await build({stdin:{contents:"export * from './lib/integrations';export {transition} from './app/workflow';export * from './app/estimate-lines';",resolveDir:process.cwd()},outfile:'outputs/estimate-freight-api.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/estimate-freight-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
await build({entryPoints:['app/estimate-settings-panel.tsx'],outfile:'outputs/estimate-freight-settings.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const api=await import('../outputs/estimate-freight-api.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/estimate-freight-panel.mjs?'+Date.now());
const {default:SettingsPanel}=await import('../outputs/estimate-freight-settings.mjs?'+Date.now());

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
try{
 const db=await mf.getD1Database('DB'),now=new Date().toISOString();
 const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({name:'Colégio Estrelas',legalName:'CEEA',minQuotes:1,holidays:[],departments:['Administrativo']})).run();
 globalThis.freightTestEnv={DB:db,WHATSAPP_SEND_ENABLED:'false'};
 const master={id:'master',name:'TESTE Master',role:'admin',department:'Administrativo'},adm={id:'adm',name:'TESTE ADM',role:'administrativo',department:'Administrativo'},dg={id:'dg',name:'TESTE DG',role:'geral',department:'Administrativo'};
 const as=u=>{globalThis.freightTestUser=u};
 const route=await import('../outputs/estimate-freight-route.mjs?'+Date.now());
 const post=body=>route.POST(new Request('https://example.com/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const school=async()=>JSON.parse((await db.prepare('SELECT data FROM school WHERE id=1').first()).data);
 const read=async id=>(await api.rows(db,'request')).find(r=>r.id===id);
 const claim=async at=>api.claimJob(db,{},at,false,'criteria-v1');
 const items=[{name:'Assento sanitário Alfa',spec:'Branco',unit:'un',quantity:5},{name:'Torneira Beta',spec:'Metal',unit:'un',quantity:2}];
 const page={url:'https://example.com/p',title:'Página fictícia',text:'Produto fictício. Preço R$ 129,90. Por unidade.'};
 const verified={status:'verified',sourceUrl:page.url,productName:'Produto fictício',productQuote:'Produto fictício.',priceAmount:129.9,currency:'BRL',priceType:'total',priceQuote:'Preço R$ 129,90.',packageQuantity:1,unit:'un',unitQuote:'Por unidade.',itemMatches:true,unitMatches:true,reason:'Produto e unidade correspondem ao pedido.'};
 const result=job=>({jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[{title:page.title,url:page.url,description:''}],analysisReason:verified.reason,priceEvidence:{origin:'public',...page,analysis:verified}});
 const estimateRequest=async id=>{
  await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind(id,'request',JSON.stringify({...budgetFixture('monthly'),id,code:'CE-'+id.toUpperCase(),department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'estimating',version:1,items,quotes:[],createdAt:now,updatedAt:now})).run();
  await api.tick(db,{},now);
  for(let j;(j=await claim(now));)await api.completeJob(db,result(j),now);
  return read(id);
 };
 const me={role:'administrativo',name:'TESTE ADM'};
 const send=(r,s={})=>api.transition({...r,form:undefined},{action:'admin_review',reason:'Encaminho para decisão.'},me,[],s,now);

 // 1. Sem percentual: frete pendente com motivo claro, estimativa não quebra, total só dos produtos.
 let saved=await estimateRequest('nopct');
 assert.equal(saved.status,'admin_review');
 let freight=saved.estimate.lines.filter(l=>l.kind==='freight');
 assert.deepEqual(freight.map(l=>[l.itemIndex,l.origin,l.value]),[[0,'pending',null],[1,'pending',null]],'frete pendente por item');
 assert.match(freight[0].reason,/Percentual padrão de frete não configurado/);
 assert.equal(saved.estimate.total,909.3,'total só dos produtos: 649,50 + 259,80');
 assert.throws(()=>send(saved),/frete pendente em 2 itens/i,'envio bloqueado sem frete');
 assert.equal(api.estimatePendingMessage(saved),undefined,'decisão da DG não depende do frete');

 // 2. Configuração: somente o Master, CEP validado, histórico com autoria e data.
 for(const u of [adm,dg]){as(u);assert.equal((await post({action:'estimate_settings',data:{schoolCep:'69086-665',freightPercent:10}})).status,403,u.role+' não configura')}
 as(master);
 assert.equal((await post({action:'estimate_settings',data:{schoolCep:'6908',freightPercent:10}})).status,400,'CEP inválido');
 assert.equal((await post({action:'estimate_settings',data:{freightPercent:-1}})).status,400,'percentual negativo');
 assert.equal((await post({action:'estimate_settings',data:{freightPercent:10.123}})).status,400,'mais de duas casas');
 let response=await post({action:'estimate_settings',data:{schoolCep:'69086665',freightPercent:10}});
 assert.equal(response.status,200,await response.clone().text());
 let s=await school();
 assert.deepEqual([s.schoolCep,s.freightPercent,s.minQuotes,s.departments],['69086-665',10,1,['Administrativo']],'CEP normalizado; demais ajustes preservados');
 assert.equal(s.estimateSettingsHistory.length,1);
 assert.deepEqual([s.estimateSettingsHistory[0].actor,s.estimateSettingsHistory[0].previous,s.estimateSettingsHistory[0].next],['TESTE Master',{},{schoolCep:'69086-665',freightPercent:10}]);
 assert.match(s.estimateSettingsHistory[0].at,/^\d{4}-\d{2}-\d{2}T/);
 const audit=await db.prepare("SELECT actor,action FROM audit WHERE entity='school'").all();
 assert.ok(audit.results.some(a=>a.actor==='TESTE Master'&&/Configuração da estimativa[\s\S]*69086-665[\s\S]*10%/.test(a.action)),'auditoria');
 response=await post({action:'estimate_settings',data:{schoolCep:'69086-665',freightPercent:10}});
 assert.equal((await school()).estimateSettingsHistory.length,1,'sem mudança não gera histórico');
 // Regras e setores continuam preservando a configuração da estimativa.
 response=await post({action:'settings',data:{minQuotes:2,departments:['Administrativo'],holidays:[]}});
 assert.equal(response.status,200,await response.clone().text());
 s=await school();assert.deepEqual([s.minQuotes,s.freightPercent,s.schoolCep,s.estimateSettingsHistory.length],[2,10,'69086-665',1]);
 // Histórico só para o Master na leitura; os demais recebem CEP e percentual.
 as(dg);let snapshot=await (await route.GET(new Request('https://example.com/api/data'))).json();
 assert.deepEqual([snapshot.settings.freightPercent,snapshot.settings.schoolCep,snapshot.settings.estimateSettingsHistory],[10,'69086-665',undefined]);
 as(master);snapshot=await (await route.GET(new Request('https://example.com/api/data'))).json();
 assert.equal(snapshot.settings.estimateSettingsHistory.length,1);
 // Tela do Master.
 const data=(role,settings=s)=>({me:{id:role,name:role,email:'',role,department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings});
 let html=renderToStaticMarkup(createElement(SettingsPanel,{data:data('admin'),busy:false,onSave:async()=>true}));
 assert.match(html,/CEP comercial da escola[\s\S]*value="69086-665"/);assert.match(html,/Percentual padrão de frete[\s\S]*value="10"/);
 assert.match(html,/Histórico da configuração \(1\)/);assert.match(html,/TESTE Master/);
 assert.equal(renderToStaticMarkup(createElement(SettingsPanel,{data:data('administrativo'),busy:false,onSave:async()=>true})),'','só o Master vê a configuração');

 // 3. Percentual configurado depois da estimativa: Diretoria Administrativa calcula pelo percentual.
 as(adm);
 response=await post({action:'estimate_freight_percent',id:'nopct',version:saved.version});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('nopct');
 freight=saved.estimate.lines.filter(l=>l.kind==='freight');
 assert.deepEqual(freight.map(l=>[l.itemIndex,l.origin,l.value]),[[0,'to_check',64.95],[1,'to_check',25.98]]);
 assert.equal(saved.estimateEditHistory.at(-1).action,'freight_percent');assert.equal(saved.estimateEditHistory.at(-1).kind,'freight');
 assert.equal((await post({action:'estimate_freight_percent',id:'nopct',version:saved.version})).status,409,'nada a recalcular');

 // 4. Nova estimativa com percentual: frete a conferir por item, motivo "frete por percentual".
 saved=await estimateRequest('pct');
 freight=saved.estimate.lines.filter(l=>l.kind==='freight');
 assert.deepEqual(freight.map(l=>[l.itemIndex,l.origin,l.value,l.freightPercent,l.freightBasis]),[[0,'to_check',64.95,10,649.5],[1,'to_check',25.98,10,259.8]]);
 assert.match(freight[0].reason,/Frete por percentual \(10% sobre o valor do produto\)/);
 assert.equal(saved.estimate.lines.some(l=>l.kind==='freight'&&l.itemIndex===undefined),false,'sem frete único da solicitação');
 // Total = produtos + frete, frete somado uma vez.
 assert.equal(saved.estimate.total,1000.23,'909,30 + 90,93');assert.equal(saved.estimate.freight,90.93);
 assert.deepEqual(api.estimateComposition(saved),{products:909.3,freight:90.93,total:1000.23});
 assert.equal(api.readEstimate(saved).total,saved.estimate.total);
 assert.match(saved.estimate.notes,/percentual padrão \(10%/);
 assert.throws(()=>send(saved),/2 fretes a conferir/i,'frete a conferir bloqueia o envio');

 // 5. Aceitar e informar frete manual: permissões, histórico e bloqueios.
 for(const u of [dg,{id:'setor',name:'TESTE Setor',role:'solicitante',department:'Administrativo'}]){as(u);
  assert.equal((await post({action:'accept_estimate_item',kind:'freight',id:'pct',version:saved.version,itemIndex:0})).status,403);
  assert.equal((await post({action:'estimate_freight',id:'pct',version:saved.version,entries:[{itemIndex:0,value:1,sourceName:'Loja'}]})).status,403);}
 as(adm);
 assert.equal((await post({action:'estimate_freight',id:'pct',version:saved.version,entries:[{itemIndex:0,value:1,sourceName:''}]})).status,400,'fonte ou justificativa obrigatória');
 response=await post({action:'accept_estimate_item',kind:'freight',id:'pct',version:saved.version,itemIndex:0});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('pct');
 let f0=saved.estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===0);
 assert.deepEqual([f0.origin,f0.value,f0.author],['accepted',64.95,'TESTE ADM']);
 assert.deepEqual([saved.estimateEditHistory.at(-1).kind,saved.estimateEditHistory.at(-1).action,saved.estimateEditHistory.at(-1).previous.origin],['freight','accept','to_check']);
 assert.equal(saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===0).origin,'automatic','aceitar frete não mexe no produto');
 assert.equal((await post({action:'accept_estimate_item',kind:'freight',id:'pct',version:saved.version,itemIndex:0})).status,409,'aceito não é aceito de novo');
 assert.equal((await post({action:'estimate_freight',id:'pct',version:saved.version,entries:[{itemIndex:0,value:1,sourceName:'Loja'}]})).status,409,'frete aceito permanece');
 response=await post({action:'estimate_freight',id:'pct',version:saved.version,entries:[{itemIndex:1,value:0,sourceName:'Entrega grátis informada pela loja',sourceUrl:'https://example.com/frete'}]});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('pct');
 const f1=saved.estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===1);
 assert.deepEqual([f1.origin,f1.value,f1.author,f1.sourceName],['manual',0,'TESTE ADM','Entrega grátis informada pela loja']);
 assert.equal(saved.estimate.total,974.25,'909,30 + 64,95 + 0');
 const actions=await db.prepare("SELECT action FROM audit WHERE entity='pct'").all();
 assert.ok(actions.results.some(a=>/frete a conferir aceito[\s\S]*Assento/.test(a.action))&&actions.results.some(a=>/frete informado[\s\S]*Torneira/.test(a.action)));
 // Envio liberado: frete aceito ou manual em todos os itens.
 assert.doesNotThrow(()=>send(saved));
 assert.equal(api.estimateSendBlockMessage(saved),undefined);

 // 6. Produto alterado: o frete aceito do item volta a ser calculado e a conferir; o manual permanece.
 const lines=saved.estimate.lines.map(l=>l.kind==='product'&&l.itemIndex===0?{...l,origin:'to_check',reason:'A conferir: teste'}:l.kind==='product'&&l.itemIndex===1?{...l,origin:'to_check',reason:'A conferir: teste'}:l);
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({...saved,estimate:{...saved.estimate,lines}}),'pct').run();
 saved=await read('pct');
 response=await post({action:'estimate_item',id:'pct',version:saved.version,entries:[{itemIndex:0,unitPrice:100,sourceName:'Loja manual',sourceUrl:'https://example.com/m',researchedOn:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date())},{itemIndex:1,unitPrice:50,sourceName:'Loja manual',sourceUrl:'https://example.com/m',researchedOn:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date())}]});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('pct');
 f0=saved.estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===0);
 assert.deepEqual([f0.origin,f0.value,f0.freightBasis],['to_check',50,500],'10% de 5 × 100');
 assert.equal(saved.estimate.lines.find(l=>l.kind==='freight'&&l.itemIndex===1).origin,'manual','frete manual permanece');
 assert.equal(saved.estimate.total,650,'500 + 100 + 50 + 0');

 // 7. Interface: DA aceita/substitui; DG vê produtos, frete e total separados, sem ações.
 html=renderToStaticMarkup(createElement(Panel,{request:saved,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Frete a conferir: Assento sanitário Alfa/);assert.match(html,/Aceitar frete de Assento sanitário Alfa/);assert.match(html,/Substituir frete por valor manual/);
 assert.match(html,/Corrigir frete manual de Torneira Beta/);
 assert.match(html,/Percentual padrão configurado pelo Master: 10%/);
 html=renderToStaticMarkup(createElement(Panel,{request:{...saved,status:'general_review'},data:data('geral'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Composição da estimativa/);
 assert.match(html,new RegExp('<th>Produtos</th><td>'+brl(600).replace(/[$]/,'\\$').replace(/\s/,'.')+'</td>'),'linha de produtos');
 assert.match(html,new RegExp('<th>Frete estimado</th><td></td><td>'+brl(50).replace(/[$]/,'\\$').replace(/\s/,'.')+'</td>'),'linha de frete');
 assert.match(html,new RegExp('<th>Total geral</th><td colSpan="3"><strong>'+brl(650).replace(/[$]/,'\\$').replace(/\s/,'.')+'</strong>'),'total geral');
 assert.doesNotMatch(html,/Aceitar frete/);

 // 8. Assinaturas digitais: frete não se aplica e não bloqueia.
 const digital=budgetFixture('digital');
 const est=api.estimateFromLines([{kind:'product',itemIndex:0,value:120,origin:'manual',sourceName:'Fonte',sourceUrl:'https://example.com/d',researchedOn:'2026-11-26',author:'ADM',at:now}],digital.items,{notes:'n',recordedAt:now,method:'manual'},api.freightPolicy(digital,{freightPercent:10}));
 const nf=est.lines.find(l=>l.kind==='freight');
 assert.deepEqual([nf.origin,nf.value,est.total,est.freightKnown],['not_applicable',null,240,true]);
 assert.equal(api.estimateSendBlockMessage({...digital,estimate:est}),undefined);
 assert.equal(api.estimateSendBlockMessage({...digital,estimate:{references:[{unitPrice:120}],freight:0,freightKnown:false,notes:'n',total:240,recordedAt:now,method:'manual'}}),undefined,'assinatura no formato antigo também não exige frete');

 // 9. Compatibilidade: estimativa por item gravada antes do ticket 06 (frete único "não apurado").
 const old={...budgetFixture('monthly'),items,id:'old',code:'CE-OLD',department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'admin_review',version:1,quotes:[],createdAt:now,updatedAt:now,
  estimate:{notes:'Antiga.',recordedAt:now,method:'automatic',total:909.3,freight:0,freightKnown:false,references:[],lines:[{kind:'product',itemIndex:0,value:129.9,origin:'automatic',author:'Sistema',at:now},{kind:'product',itemIndex:1,value:129.9,origin:'automatic',author:'Sistema',at:now},{kind:'freight',value:null,origin:'pending',reason:'Frete não apurado — não incluído no total',author:'Sistema',at:now}]}};
 assert.equal(api.readEstimate(old).total,909.3,'leitura não quebra');
 assert.doesNotThrow(()=>renderToStaticMarkup(createElement(Panel,{request:old,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}})));
 html=renderToStaticMarkup(createElement(Panel,{request:old,data:data('administrativo'),busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Calcular frete pelo percentual \(10%\)/);
 assert.throws(()=>send(old),/frete pendente em 2 itens/i,'frete exigido antes do envio');
 await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind('old','request',JSON.stringify(old)).run();
 response=await post({action:'estimate_freight_percent',id:'old',version:1});
 assert.equal(response.status,200,await response.clone().text());
 const converted=await read('old');
 assert.deepEqual(converted.estimate.lines.filter(l=>l.kind==='freight').map(l=>[l.itemIndex,l.origin,l.value]),[[0,'to_check',64.95],[1,'to_check',25.98]]);
 // Já enviada à DG antes do ticket 06: a decisão da DG não passa a exigir frete.
 assert.doesNotThrow(()=>api.transition({...old,form:undefined,status:'general_review',adminReview:'ok'},{action:'approve',reason:'Aprovado pela DG.'},{role:'geral',name:'DG'},[],{},now));
 // Formato antigo (sem linhas): frete único; "não apurado" bloqueia o envio, frete informado libera.
 const legacy={...old,estimate:{references:[{unitPrice:129.9,sourceUrl:'https://example.com/a',sourceName:'A',researchedOn:'2026-11-12'},{unitPrice:129.9,sourceUrl:'https://example.com/a',sourceName:'A',researchedOn:'2026-11-12'}],freight:0,freightKnown:false,notes:'Antiga.',total:909.3,recordedAt:now,method:'manual'}};
 assert.throws(()=>send(legacy),/frete pendente em 1 item/i);
 assert.doesNotThrow(()=>send({...legacy,estimate:{...legacy.estimate,freight:30,freightKnown:true,total:939.3}}));
 assert.deepEqual(api.estimateComposition({...legacy,estimate:{...legacy.estimate,freight:30,freightKnown:true,total:939.3}}),{products:909.3,freight:30,total:939.3},'formato antigo: frete único somado uma vez');
 console.log('PASS: configuração só do Master com histórico, frete por percentual a conferir, aceite/manual com histórico, total sem dupla contagem, envio à DG exige frete, DG vê composição, assinaturas não se aplica e estimativas antigas.');
}finally{await mf.dispose();delete globalThis.freightTestEnv;delete globalThis.freightTestUser}
