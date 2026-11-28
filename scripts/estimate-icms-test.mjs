// Ticket 08 (E1): ICMS estimado pela diferença de alíquota (DIFAL) nas compras de outro estado.
// O Master (somente ele) mantém a tabela de alíquotas por vigência e a chave do cálculo, com
// histórico; chave desligada (padrão): linha aguardando contador, sem bloquear o envio à DG.
// Ligada: (interna AM − interestadual da UF de origem) × (produto + frete), tabela registrada
// na linha; origem não identificada = a conferir; loja do AM e assinaturas = não se aplica;
// aceite/UF/valor manual com histórico; total = produtos + frete + ICMS; DG vê a composição.
// Rota real + ponte simulada no D1 local (Miniflare), sem busca, WhatsApp ou mensagem real.
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
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='bindings'?'export const env=globalThis.icmsTestEnv;':'export const currentLocalUser=async()=>globalThis.icmsTestUser;',loader:'js'}));
}};
await build({entryPoints:['app/api/data/route.ts'],outfile:'outputs/estimate-icms-route.mjs',bundle:true,platform:'node',format:'esm',plugins:[bindings]});
await build({stdin:{contents:"export * from './lib/integrations';export {transition} from './app/workflow';export * from './app/estimate-lines';export * from './app/estimate-icms';",resolveDir:process.cwd()},outfile:'outputs/estimate-icms-api.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/estimate-icms-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
await build({entryPoints:['app/estimate-settings-panel.tsx'],outfile:'outputs/estimate-icms-settings.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const api=await import('../outputs/estimate-icms-api.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/estimate-icms-panel.mjs?'+Date.now());
const {default:SettingsPanel}=await import('../outputs/estimate-icms-settings.mjs?'+Date.now());

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB'),now=new Date().toISOString();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
 const tomorrow=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date(Date.now()+86400000));
 const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({name:'Colégio Estrelas',legalName:'CEEA',minQuotes:1,holidays:[],departments:['Administrativo'],freightPercent:10})).run();
 globalThis.icmsTestEnv={DB:db,WHATSAPP_SEND_ENABLED:'false'};
 const master={id:'master',name:'TESTE Master',role:'admin',department:'Administrativo'},adm={id:'adm',name:'TESTE ADM',role:'administrativo',department:'Administrativo'},dg={id:'dg',name:'TESTE DG',role:'geral',department:'Administrativo'},setor={id:'setor',name:'TESTE Setor',role:'solicitante',department:'Administrativo'};
 const as=u=>{globalThis.icmsTestUser=u};
 const route=await import('../outputs/estimate-icms-route.mjs?'+Date.now());
 const post=body=>route.POST(new Request('https://example.com/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const ok=async(body,msg)=>{const r=await post(body);assert.equal(r.status,200,(msg||body.action)+': '+await r.clone().text());return r};
 const school=async()=>JSON.parse((await db.prepare('SELECT data FROM school WHERE id=1').first()).data);
 const read=async id=>(await api.rows(db,'request')).find(r=>r.id===id);
 const claim=async at=>api.claimJob(db,{},at,false,'criteria-v1');
 const items=[{name:'Assento sanitário Alfa',spec:'Branco',unit:'un',quantity:5},{name:'Torneira Beta',spec:'Metal',unit:'un',quantity:2}];
 const seller='Vendido e entregue por Loja Fictícia, São Paulo - SP.';
 const page={url:'https://example.com/p',title:'Página fictícia',text:'Produto fictício. Preço R$ 129,90. Por unidade. '+seller};
 const verified={status:'verified',sourceUrl:page.url,productName:'Produto fictício',productQuote:'Produto fictício.',priceAmount:129.9,currency:'BRL',priceType:'total',priceQuote:'Preço R$ 129,90.',packageQuantity:1,unit:'un',unitQuote:'Por unidade.',itemMatches:true,unitMatches:true,reason:'Produto e unidade correspondem ao pedido.'};
 const result=(job,origin={})=>({jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[{title:page.title,url:page.url,description:''}],analysisReason:verified.reason,priceEvidence:{origin:'public',...page,analysis:{...verified,...origin}}});
 const estimateRequest=async(id,origin=()=>({}))=>{
  await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind(id,'request',JSON.stringify({...budgetFixture('monthly'),id,code:'CE-'+id.toUpperCase(),department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'estimating',version:1,items,quotes:[],createdAt:now,updatedAt:now})).run();
  await api.tick(db,{},now);
  for(let j;(j=await claim(now));)await api.completeJob(db,result(j,origin(j)),now);
  return read(id);
 };
 const icmsOf=(r,i)=>r.estimate.lines.find(l=>l.kind==='icms'&&l.itemIndex===i);
 const acceptFreights=async id=>{for(const i of [0,1]){const r=await read(id);await ok({action:'accept_estimate_item',kind:'freight',id,version:r.version,itemIndex:i})}return read(id)};
 const sendCheck=(r,s)=>api.transition({...r,form:undefined},{action:'admin_review',reason:'Encaminho para decisão.'},{role:'administrativo',name:'TESTE ADM'},[],s,now);
 const data=(role,settings)=>({me:{id:role,name:role,email:'',role,department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings});
 const panel=(r,role,settings)=>renderToStaticMarkup(createElement(Panel,{request:r,data:data(role,settings),busy:false,onSave:async()=>true,onDecision:()=>{}}));

 // 1. Chave desligada (padrão): linha "aguardando contador" por item, fora do total, sem bloquear o envio.
 let off=await estimateRequest('off');
 assert.equal(off.status,'admin_review');
 assert.deepEqual([0,1].map(i=>[icmsOf(off,i).origin,icmsOf(off,i).value]),[['awaiting_accountant',null],['awaiting_accountant',null]]);
 assert.match(icmsOf(off,0).reason,/desligado pelo Master até a confirmação do contador/);
 assert.equal(off.estimate.total,1000.23,'produtos 909,30 + frete 90,93, sem ICMS');
 assert.match(off.estimate.notes,/ICMS aguardando contador/);
 as(adm);off=await acceptFreights('off');
 const offSettings=await school();
 assert.doesNotThrow(()=>sendCheck(off,offSettings),'chave desligada: ICMS não impede o envio');
 assert.equal(api.estimateSendBlockMessage(off,false),undefined);
 let html=panel(off,'administrativo',await school());
 assert.match(html,/Aguardando contador: o cálculo do ICMS/);assert.doesNotMatch(html,/Calcular ICMS/);
 assert.equal((await post({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:0,uf:'SP'}]})).status,409,'chave desligada: sem ICMS manual');

 // 2. Configuração: somente o Master, validação, vigência e histórico com autoria e data.
 const table={validFrom:today,internalRate:20,interstate:{SP:7,PR:7,ES:12,PA:12},exceptions:[{label:'Produto importado',rate:4}]};
 for(const u of [adm,dg,setor]){as(u);assert.equal((await post({action:'icms_settings',data:{enabled:true,table}})).status,403,u.role+' não configura ICMS')}
 as(master);
 html=renderToStaticMarkup(createElement(SettingsPanel,{data:data('admin',await school()),busy:false,onSave:async()=>true}));
 assert.match(html,/Valores sugeridos — conferir com o contador/);assert.match(html,/name="internalRate"[^>]*value="20"/);assert.match(html,/name="icms_SP"[^>]*value="7"/);assert.match(html,/name="icms_ES"[^>]*value="12"/);
 assert.equal(api.freightPolicy({},await school(),now).icms.table,undefined,'sugestão da tela não vale para o cálculo');
 assert.equal((await post({action:'icms_settings',data:{enabled:true}})).status,400,'ligar sem tabela');
 assert.equal((await post({action:'icms_settings',data:{enabled:false,table:{...table,interstate:{AM:20}}}})).status,400,'AM não é origem interestadual');
 assert.equal((await post({action:'icms_settings',data:{enabled:false,table:{...table,internalRate:120}}})).status,400,'alíquota acima de 100%');
 assert.equal((await post({action:'icms_settings',data:{enabled:true,table:{...table,validFrom:tomorrow}}})).status,400,'só tabela futura: não liga');
 await ok({action:'icms_settings',data:{enabled:false,table}});
 let s=await school();
 assert.deepEqual([s.icmsEnabled,s.icmsTables.length,s.icmsTables[0].internalRate,s.icmsTables[0].savedBy,s.freightPercent],[false,1,20,'TESTE Master',10],'tabela salva; frete preservado');
 await ok({action:'icms_settings',data:{enabled:false,table}});
 assert.equal((await school()).estimateSettingsHistory.length,1,'sem mudança não gera histórico');
 await ok({action:'icms_settings',data:{enabled:false,table:{...table,validFrom:tomorrow,internalRate:21}}});
 await ok({action:'icms_settings',data:{enabled:true}});
 s=await school();
 assert.equal(s.icmsEnabled,true);assert.equal(s.icmsTables.length,2,'vigências preservadas');
 const h=s.estimateSettingsHistory;
 assert.deepEqual(h.map(x=>[x.actor,x.previous.icmsEnabled,x.next.icmsEnabled,x.next.icmsTable?.validFrom]),[['TESTE Master',false,false,today],['TESTE Master',false,false,tomorrow],['TESTE Master',false,true,undefined]]);
 assert.equal(api.freightPolicy({},s,now).icms.table.validFrom,today,'a tabela futura ainda não vale');
 const audit=await db.prepare("SELECT actor,action FROM audit WHERE entity='school'").all();
 assert.ok(audit.results.some(a=>a.actor==='TESTE Master'&&/Configuração do ICMS atualizada: cálculo desligado → ligado/.test(a.action)),'auditoria');
 // Outras configurações preservam o ICMS.
 await ok({action:'estimate_settings',data:{freightPercent:10}});await ok({action:'settings',data:{minQuotes:1,departments:['Administrativo'],holidays:[]}});
 s=await school();assert.deepEqual([s.icmsEnabled,s.icmsTables.length],[true,2]);
 as(dg);let snapshot=await (await route.GET(new Request('https://example.com/api/data'))).json();
 assert.equal(snapshot.settings.estimateSettingsHistory,undefined,'histórico só para o Master');assert.equal(snapshot.settings.icmsEnabled,true);
 html=renderToStaticMarkup(createElement(SettingsPanel,{data:data('admin',s),busy:false,onSave:async()=>true}));
 assert.match(html,/Cálculo do ICMS:<\/strong> ligado/);assert.match(html,/Desligar cálculo do ICMS/);assert.match(html,/Tabelas de ICMS salvas \(2\)/);assert.doesNotMatch(html,/Valores sugeridos/);
 assert.match(html,/ICMS desligado → ICMS ligado/);
 assert.equal(renderToStaticMarkup(createElement(SettingsPanel,{data:data('administrativo',s),busy:false,onSave:async()=>true})),'');

 // 3. Chave ligada depois da estimativa: o envio passa a exigir o ICMS; o ADM calcula pela tabela.
 as(adm);off=await read('off');
 assert.throws(()=>sendCheck(off,s),/ICMS pendente em 2 itens/);
 await ok({action:'estimate_icms_table',id:'off',version:off.version});
 off=await read('off');
 assert.deepEqual([0,1].map(i=>[icmsOf(off,i).origin,icmsOf(off,i).value]),[['to_check',null],['to_check',null]],'ponte sem UF: origem não identificada, a conferir');
 assert.match(icmsOf(off,0).reason,/Estado de origem da loja não identificado/);
 assert.deepEqual([off.estimateEditHistory.at(-1).kind,off.estimateEditHistory.at(-1).action,off.estimateEditHistory.at(-1).previous.origin],['icms','icms_table','awaiting_accountant']);
 assert.equal((await post({action:'estimate_icms_table',id:'off',version:off.version})).status,409,'nada a recalcular');
 assert.equal((await post({action:'accept_estimate_item',kind:'icms',id:'off',version:off.version,itemIndex:0})).status,409,'sem valor não há aceite');
 // UF informada: tabela vigente aplicada sobre produto + frete; AM = não se aplica.
 for(const u of [dg,setor]){as(u);assert.equal((await post({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:0,uf:'SP'}]})).status,403)}
 as(adm);
 assert.equal((await post({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:0,uf:'XX'}]})).status,400,'UF inválida');
 await ok({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:0,uf:'SP'},{itemIndex:1,uf:'AM'}]});
 off=await read('off');
 let c0=icmsOf(off,0),c1=icmsOf(off,1);
 assert.deepEqual([c0.origin,c0.originState,c0.originStateSource,c0.icmsRate,c0.icmsBasis,c0.value,c0.icmsTableFrom,c0.author],['manual','SP','manual',13,714.45,92.88,today,'TESTE ADM'],'(20% − 7%) × (649,50 + 64,95)');
 assert.match(c0.reason,new RegExp('tabela vigente desde '+today.split('-').reverse().join('/')));
 assert.deepEqual([c1.origin,c1.value,c1.originState],['not_applicable',null,'AM']);assert.match(c1.reason,/Loja do Amazonas: ICMS já incluído no preço/);
 assert.equal(off.estimate.total,1093.11,'909,30 + 90,93 + 92,88');
 assert.deepEqual(api.estimateComposition(off),{products:909.3,freight:90.93,icms:92.88,total:1093.11});
 assert.doesNotThrow(()=>sendCheck(off,s),'ICMS manual e não se aplica liberam o envio');
 const actions=await db.prepare("SELECT action FROM audit WHERE entity='off'").all();
 assert.ok(actions.results.some(a=>/ICMS informado[\s\S]*Assento[\s\S]*origem SP/.test(a.action)));
 // Produto alterado: UF manual mantida, ICMS recalculado e a conferir; aceite com um clique.
 off=await read('off');
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({...off,estimate:{...off.estimate,lines:off.estimate.lines.map(l=>l.kind==='product'&&l.itemIndex===0?{...l,origin:'to_check',reason:'teste'}:l)}}),'off').run();
 off=await read('off');
 await ok({action:'estimate_item',id:'off',version:off.version,entries:[{itemIndex:0,unitPrice:100,sourceName:'Loja manual',sourceUrl:'https://example.com/m',researchedOn:today}]});
 off=await read('off');c0=icmsOf(off,0);
 assert.deepEqual([c0.origin,c0.originState,c0.icmsBasis,c0.value],['to_check','SP',550,71.5],'13% × (500 + 50)');assert.match(c0.reason,/Recalculado[\s\S]*UF SP informada por TESTE ADM/);
 await ok({action:'accept_estimate_item',kind:'icms',id:'off',version:off.version,itemIndex:0});
 off=await read('off');c0=icmsOf(off,0);
 assert.deepEqual([c0.origin,c0.author,off.estimateEditHistory.at(-1).kind,off.estimateEditHistory.at(-1).action],['accepted','TESTE ADM','icms','accept']);
 assert.equal((await post({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:0,value:1,sourceName:'Teste'}]})).status,409,'ICMS aceito permanece');
 // Exceção (importado) e valor manual com justificativa.
 assert.equal((await post({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:1,value:5,sourceName:''}]})).status,400,'justificativa obrigatória');
 await ok({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:1,uf:'PR',exception:'Produto importado'}]});
 off=await read('off');c1=icmsOf(off,1);
 assert.deepEqual([c1.origin,c1.icmsException,c1.icmsInterstateRate,c1.icmsRate,c1.value],['manual','Produto importado',4,16,45.72],'(20% − 4%) × (259,80 + 25,98)');
 await ok({action:'estimate_icms',id:'off',version:off.version,entries:[{itemIndex:1,value:30,sourceName:'Orientação do contador'}]});
 off=await read('off');c1=icmsOf(off,1);
 assert.deepEqual([c1.origin,c1.value,c1.sourceName,c1.icmsRate],['manual',30,'Orientação do contador',undefined]);

 // 4. Nova estimativa com a chave ligada: UF da pesquisa comprovada = automático; sem trecho = a conferir.
 let on=await estimateRequest('on',j=>j.itemIndex===0?{originState:'SP',originStateQuote:seller}:{originState:'PA'});
 assert.equal(on.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===0).originState,'SP');
 c0=icmsOf(on,0);c1=icmsOf(on,1);
 assert.deepEqual([c0.origin,c0.value,c0.originStateSource],['automatic',92.88,'research']);assert.match(c0.reason,/Origem SP \(São Paulo\) comprovada pela página/);
 assert.deepEqual([c1.origin,c1.icmsRate,c1.value],['to_check',8,22.86],'(20% − 12%) × (259,80 + 25,98), a conferir');assert.match(c1.reason,/Origem PA identificada pela pesquisa, sem trecho/);
 assert.match(on.estimate.notes,/ICMS estimado pela diferença de alíquota/);
 on=await acceptFreights('on');
 assert.throws(()=>sendCheck(on,s),/1 ICMS a conferir/);
 html=panel(on,'administrativo',s);
 assert.match(html,/ICMS a conferir: Torneira Beta/);assert.match(html,/Aceitar ICMS de Torneira Beta/);assert.match(html,/ICMS: Assento sanitário Alfa/);assert.match(html,/Calcular ICMS pela UF de origem/);
 assert.match(html,/Tabela do Master: tabela vigente desde/);
 await ok({action:'accept_estimate_item',kind:'icms',id:'on',version:on.version,itemIndex:1});
 on=await read('on');
 assert.doesNotThrow(()=>sendCheck(on,s));
 assert.equal(on.estimate.total,1115.97,'909,30 + 90,93 + 92,88 + 22,86');
 // DG vê produtos, frete, ICMS e total separados, sem ações.
 html=panel({...on,status:'general_review'},'geral',s);
 const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v).replace(/[$]/,'\\$').replace(/\s/,'.');
 assert.match(html,/<th>ICMS estimado<\/th><th>Origem do ICMS<\/th>/);
 assert.match(html,new RegExp('<th>Produtos</th><td>'+brl(909.3)+'</td>'));
 assert.match(html,new RegExp('<th>Frete estimado</th><td></td><td>'+brl(90.93)+'</td>'));
 assert.match(html,new RegExp('<th>ICMS estimado</th><td></td><td></td><td></td><td>'+brl(115.74)+'</td>'));
 assert.match(html,new RegExp('<th>Total geral</th><td colSpan="5"><strong>'+brl(1115.97)+'</strong>'));
 assert.match(html,/Automático · origem SP/);
 assert.doesNotMatch(html,/Aceitar ICMS/);

 // 5. Assinaturas digitais: ICMS não se aplica (serviço digital, sem DIFAL de mercadoria).
 const digital=budgetFixture('digital');
 const est=api.estimateFromLines([{kind:'product',itemIndex:0,value:120,origin:'manual',sourceName:'Fonte',sourceUrl:'https://example.com/d',researchedOn:today,author:'ADM',at:now}],digital.items,{notes:'n',recordedAt:now,method:'manual'},api.freightPolicy(digital,s,now));
 const nd=est.lines.find(l=>l.kind==='icms');
 assert.deepEqual([nd.origin,nd.value],['not_applicable',null]);assert.match(nd.reason,/serviço digital, sem DIFAL de mercadoria/);
 assert.equal(api.estimateSendBlockMessage({...digital,estimate:est},true),undefined);

 // 6. Compatibilidade: estimativas sem linha de ICMS continuam lidas; já na DG, a decisão não exige ICMS.
 const old={...budgetFixture('monthly'),items,id:'old',code:'CE-OLD',department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'general_review',adminReview:'ok',version:1,quotes:[],createdAt:now,updatedAt:now,
  estimate:{notes:'Antiga.',recordedAt:now,method:'automatic',total:974.25,freight:64.95,freightKnown:true,references:[],lines:[{kind:'product',itemIndex:0,value:129.9,origin:'automatic',author:'Sistema',at:now},{kind:'product',itemIndex:1,value:129.9,origin:'automatic',author:'Sistema',at:now},{kind:'freight',itemIndex:0,value:64.95,origin:'accepted',at:now},{kind:'freight',itemIndex:1,value:0,origin:'manual',sourceName:'Grátis',at:now}]}};
 assert.equal(api.readEstimate(old).total,974.25);
 assert.deepEqual(api.estimateComposition(old),{products:909.3,freight:64.95,icms:0,total:974.25});
 assert.doesNotThrow(()=>panel(old,'geral',s));
 assert.doesNotThrow(()=>api.transition({...old,form:undefined},{action:'approve',reason:'Aprovado pela DG.'},{role:'geral',name:'DG'},[],s,now),'DG decide sem ICMS');
 assert.throws(()=>sendCheck({...old,status:'admin_review'},s),/ICMS pendente em 2 itens/,'na revisão, com a chave ligada, o ICMS é exigido');
 const legacy={...old,status:'admin_review',estimate:{references:[{unitPrice:129.9,sourceUrl:'https://example.com/a',sourceName:'A',researchedOn:'2026-11-12'},{unitPrice:129.9,sourceUrl:'https://example.com/a',sourceName:'A',researchedOn:'2026-11-12'}],freight:30,freightKnown:true,notes:'Antiga.',total:939.3,recordedAt:now,method:'manual'}};
 assert.doesNotThrow(()=>sendCheck(legacy,s),'formato antigo não passa a exigir ICMS');
 console.log('PASS: tabela de ICMS com vigência e chave só do Master com histórico, aguardando contador sem bloquear, DIFAL por UF sobre produto + frete com a tabela registrada, origem não identificada a conferir, AM e assinaturas não se aplica, aceite/UF/exceção/valor manual com histórico, total com ICMS, envio exige ICMS só com a chave ligada, DG vê a composição e estimativas antigas.');
}finally{await mf.dispose();delete globalThis.icmsTestEnv;delete globalThis.icmsTestUser}
