// Ticket 04 (E1): na revisão da estimativa, refazer a busca de um item mantém a
// solicitação em admin_review e as demais linhas; o item fica em andamento; resultado
// de busca anterior do mesmo item nunca preenche a revisão; preço manual informado
// durante a busca prevalece. Rota real + ponte simulada no D1 local (Miniflare), sem
// busca, WhatsApp ou mensagem real.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const bindings={name:'test-bindings',setup(b){
 b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'test'}));
 b.onResolve({filter:/local-session$/},()=>({path:'session',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='bindings'?'export const env=globalThis.redoTestEnv;':'export const currentLocalUser=async()=>globalThis.redoTestUser;',loader:'js'}));
}};
await build({entryPoints:['app/api/data/route.ts'],outfile:'outputs/estimate-item-research-route.mjs',bundle:true,platform:'node',format:'esm',plugins:[bindings]});
await build({stdin:{contents:"export * from './lib/integrations';",resolveDir:process.cwd()},outfile:'outputs/estimate-item-research-api.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/estimate-item-research-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const api=await import('../outputs/estimate-item-research-api.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/estimate-item-research-panel.mjs?'+Date.now());

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
const later=(at,minutes)=>new Date(Date.parse(at)+minutes*60000).toISOString();
try{
 const db=await mf.getD1Database('DB'),now=new Date().toISOString(); // a rota HTTP usa o relógio real; um horário fixo deixa a tarefa no futuro
 const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({minQuotes:1,holidays:[],departments:['Administrativo']})).run();
 globalThis.redoTestEnv={DB:db,WHATSAPP_SEND_ENABLED:'false'};
 const adm={id:'adm',name:'TESTE ADM',role:'administrativo'};globalThis.redoTestUser=adm;
 const route=await import('../outputs/estimate-item-research-route.mjs?'+Date.now());
 const post=body=>route.POST(new Request('https://example.com/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const read=async id=>(await api.rows(db,'request')).find(r=>r.id===id);
 const jobs=async()=>(await api.rows(db,'integration_job'));

 const found={name:'Assento sanitário Modelo Alfa',spec:'Branco',unit:'un',quantity:5},missing={name:'Peça rara Modelo Ômega',spec:'Cinza',unit:'un',quantity:2};
 const source={title:'Página fictícia',url:'https://example.com/product',description:'Fonte fictícia'};
 const priced=(job,amount)=>{const quote=`Preço R$ ${amount.toFixed(2).replace('.',',')}`;return {jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[source],analysisReason:'Produto correspondente.',priceEvidence:{origin:'public',url:source.url,title:source.title,text:source.title+'\n'+quote+'\nPor unidade.',analysis:{status:'verified',sourceUrl:source.url,productName:source.title,productQuote:source.title,priceAmount:amount,currency:'BRL',priceType:'total',priceQuote:quote,packageQuantity:1,unit:'un',unitQuote:'Por unidade.',itemMatches:true,unitMatches:true,reason:'Produto, cor e unidade correspondem ao pedido.'}}}};
 const noPrice=job=>({jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[{...source,url:'https://example.com/other'}],analysisReason:'Nenhuma página mostra preço por unidade.'});
 const claim=async at=>api.claimJob(db,{},at,false,'criteria-v1');

 // Chega à revisão da estimativa com 1 preço automático + 1 pendência (ticket 02).
 await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind('redo','request',JSON.stringify({id:'redo',code:'CE-REDO',title:'Pedido fictício',department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'estimating',items:[found,missing],quotes:[],createdAt:now,updatedAt:now,adminReview:'Síntese anterior preservada'})).run();
 await api.tick(db,{},now);
 const first=[await claim(now),await claim(now)].sort((a,b)=>a.itemIndex-b.itemIndex);
 await api.completeJob(db,priced(first[0],129.9),now);
 await api.completeJob(db,noPrice(first[1]),now);
 let saved=await read('redo');
 assert.equal(saved.status,'admin_review');
 const line0=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===0);
 const freight=saved.estimate.lines.find(l=>l.kind==='freight');
 assert.equal(line0.value,129.9);

 // Refazer a busca do item 2 pela rota: continua na revisão, demais linhas intactas.
 const criteria={searchName:'Peça rara Ômega cinza',minimumRequirements:'Cinza, compatível',allowSimilar:true,brandPolicy:'reference',brandModel:''};
 const t1=later(now,5);
 let response=await post({action:'research_item',id:'redo',version:saved.version,itemIndex:1,criteria});
 assert.equal(response.status,200,await response.clone().text());
 const before=saved;saved=await read('redo');
 assert.equal(saved.status,'admin_review','solicitação permanece na revisão da estimativa');
 assert.equal(saved.adminReview,'Síntese anterior preservada','parecer em curso não é apagado');
 assert.deepEqual(saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===0),line0,'linha do outro item intacta');
 assert.deepEqual(saved.estimate.lines.find(l=>l.kind==='freight'),freight,'frete intacto');
 const rev1=saved.estimateCriteria[1].revision;
 let line1=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1);
 assert.deepEqual([line1.value,line1.origin,line1.searchRevision],[null,'pending',rev1],'item em andamento ligado à revisão do critério');
 assert.match(line1.reason,/busca em andamento/i);
 assert.equal(saved.estimate.total,649.5,'total só com os itens valorados');
 assert.equal(saved.estimateCriteria[0],before.estimateCriteria?.[0],'critério do outro item não muda');
 const ch=saved.estimateCriteriaHistory.at(-1);assert.equal(ch.itemIndex,1);assert.equal(ch.actor,'TESTE ADM');assert.ok(ch.at);
 const eh=saved.estimateEditHistory.at(-1);
 assert.deepEqual([eh.action,eh.itemIndex,eh.actor,eh.previous.origin,eh.line.searchRevision],['research',1,'TESTE ADM','pending',rev1],'histórico registra quem refez e quando');assert.ok(eh.at);
 const audit=await db.prepare("SELECT action FROM audit WHERE entity='redo'").all();
 assert.ok(audit.results.some(a=>/Nova busca.*Peça rara Modelo Ômega/i.test(a.action)),'auditoria registra a nova busca do item');
 let queued=(await jobs()).filter(j=>j.requestId==='redo'&&j.state==='queued');
 assert.equal(queued.length,1,'só a tarefa do item refeito é enfileirada');
 assert.equal(queued[0].itemIndex,1);assert.equal(queued[0].researchCriteria.revision,rev1);
 assert.equal(queued[0].id,await api.estimateSearchId(saved,1));
 // Envio à DG segue bloqueado com o item em andamento.
 globalThis.redoTestUser=adm;
 assert.equal((await post({action:'admin_review',id:'redo',version:saved.version,reason:'Encaminho para decisão.'})).status,409,'pendência bloqueia o envio à DG');

 // A ponte pega a busca 1; antes do resultado, a DA refaz de novo (busca 2).
 const j1=await claim(t1);assert.equal(j1.id,queued[0].id);
 response=await post({action:'research_item',id:'redo',version:saved.version,itemIndex:1,criteria:{...criteria,minimumRequirements:'Cinza, compatível, nova revisão'}});
 assert.equal(response.status,200,await response.clone().text());
 saved=await read('redo');const rev2=saved.estimateCriteria[1].revision;assert.notEqual(rev2,rev1);
 assert.equal(saved.estimate.lines.find(l=>l.itemIndex===1&&l.kind==='product').searchRevision,rev2);
 // Resultado da busca anterior chega com preço: ignorado na revisão atual.
 await api.completeJob(db,priced(j1,99),later(t1,1));
 saved=await read('redo');
 line1=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1);
 assert.deepEqual([line1.value,line1.searchRevision],[null,rev2],'busca anterior não preenche a revisão atual');
 await api.tick(db,{},later(t1,2));
 assert.equal((await read('redo')).estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1).value,null,'nem no próximo ciclo');
 // A busca atual conclui com preço: linha atualizada, sem andamento, demais intactas.
 const j2=await claim(later(t1,3));assert.equal(j2.researchCriteria.revision,rev2);
 await api.completeJob(db,priced(j2,40),later(t1,4));
 saved=await read('redo');
 assert.equal(saved.status,'admin_review');
 line1=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1);
 assert.deepEqual([line1.value,line1.origin,line1.author,line1.searchRevision],[40,'automatic','Sistema',undefined]);
 assert.equal(line1.sourceUrl,source.url);
 assert.deepEqual(saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===0),line0);
 assert.equal(saved.estimate.total,729.5,'total recomposto: 649,50 + 80');
 assert.deepEqual(saved.estimate.references.map(r=>r.unitPrice),[129.9,40],'campos antigos coerentes');
 assert.equal(saved.estimateEditHistory.at(-1).action,'research_result');assert.equal(saved.estimateEditHistory.at(-1).actor,'Sistema');
 let version=saved.version;await api.tick(db,{},later(t1,5));assert.equal((await read('redo')).version,version,'sem regravação no próximo ciclo');

 // Busca sem preço: volta a pendência com o motivo, ainda na revisão.
 response=await post({action:'research_item',id:'redo',version:saved.version,itemIndex:0,criteria:{searchName:'Assento Alfa',minimumRequirements:'Branco',allowSimilar:false,brandPolicy:'reference',brandModel:''}});
 assert.equal(response.status,200);
 // Duas solicitações seguidas sem a ponte pegar a primeira: a antiga é cancelada.
 saved=await read('redo');
 response=await post({action:'research_item',id:'redo',version:saved.version,itemIndex:0,criteria:{searchName:'Assento Alfa branco',minimumRequirements:'Branco',allowSimilar:false,brandPolicy:'reference',brandModel:''}});
 assert.equal(response.status,200);
 saved=await read('redo');
 const j3=await claim(later(t1,6));
 assert.equal(j3.researchCriteria.revision,saved.estimateCriteria[0].revision,'a ponte pega só a busca atual');
 assert.ok((await jobs()).some(j=>j.requestId==='redo'&&j.itemIndex===0&&j.state==='cancelled'),'busca anterior ainda na fila foi cancelada');
 await api.completeJob(db,noPrice(j3),later(t1,7));
 saved=await read('redo');
 const l0=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===0);
 assert.deepEqual([l0.value,l0.origin,l0.reason,l0.searchRevision],[null,'pending','Nenhuma página mostra preço por unidade.',undefined]);
 assert.equal(saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1).value,40,'outro item intacto');

 // Preço manual informado durante a busca prevalece sobre o resultado.
 response=await post({action:'research_item',id:'redo',version:saved.version,itemIndex:1,criteria});
 assert.equal(response.status,200);
 const j4=await claim(later(t1,8));assert.equal(j4.itemIndex,1);
 saved=await read('redo');
 let html=renderToStaticMarkup(createElement(Panel,{request:saved,data:{me:{id:'adm',name:'ADM',email:'',role:'administrativo',department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings:{name:'Colégio Estrelas',legalName:'CEEA',minQuotes:3,departments:['Administrativo']}},busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Peça rara Modelo Ômega[\s\S]{0,400}Busca em andamento/,'item aparece em andamento');
 assert.match(html,/Refazer busca de Assento sanitário Modelo Alfa/,'botão de refazer por item');
 assert.match(html,/Informar preço de Peça rara Modelo Ômega/,'preço manual possível durante a busca');
 response=await post({action:'estimate_item',id:'redo',version:saved.version,entries:[{itemIndex:1,unitPrice:45,sourceName:'Loja manual fictícia',sourceUrl:'https://example.com/manual',researchedOn:'2026-11-26'}]});
 assert.equal(response.status,200,await response.clone().text());
 await api.completeJob(db,priced(j4,30),later(t1,9));
 saved=await read('redo');
 line1=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1);
 assert.deepEqual([line1.value,line1.origin,line1.author,line1.searchRevision],[45,'manual','TESTE ADM',undefined],'manual vence o resultado da busca');
 html=renderToStaticMarkup(createElement(Panel,{request:saved,data:{me:{id:'adm',name:'ADM',email:'',role:'administrativo',department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings:{name:'Colégio Estrelas',legalName:'CEEA',minQuotes:3,departments:['Administrativo']}},busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Histórico do preenchimento/);assert.match(html,/nova busca/i,'histórico mostra a nova busca');
 // A Diretoria Geral não refaz busca.
 html=renderToStaticMarkup(createElement(Panel,{request:{...saved,status:'general_review'},data:{me:{id:'dg',name:'DG',email:'',role:'geral',department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings:{name:'Colégio Estrelas',legalName:'CEEA',minQuotes:3,departments:['Administrativo']}},busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.doesNotMatch(html,/Refazer busca/);
 globalThis.redoTestUser={id:'dg',name:'TESTE DG',role:'geral'};
 assert.equal((await post({action:'research_item',id:'redo',version:saved.version,itemIndex:1,criteria})).status,403,'DG não refaz busca');
 globalThis.redoTestUser=adm;

 // Fora do formato por item (estimativa antiga), o comportamento anterior continua.
 await db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind('legacy','request',JSON.stringify({id:'legacy',code:'CE-LEG',title:'Pedido antigo',department:'Administrativo',authorId:'setor',authorName:'TESTE Setor',status:'admin_review',items:[found],quotes:[],createdAt:now,updatedAt:now,estimate:{method:'manual',references:[{unitPrice:10,sourceUrl:'https://example.com/x',sourceName:'Fonte',researchedOn:'2026-11-20'}],freight:0,notes:'Antiga manual.',total:50,recordedAt:now}})).run();
 assert.equal((await post({action:'research_item',id:'legacy',version:1,itemIndex:0,criteria})).status,200);
 const legacy=await read('legacy');assert.equal(legacy.status,'estimating');assert.equal(legacy.estimate,undefined);
 console.log('PASS: refazer um item mantém a revisão e as demais linhas, ignora busca anterior, histórico com autoria, manual vence e interface.');
}finally{await mf.dispose();delete globalThis.redoTestEnv;delete globalThis.redoTestUser}
