// Ticket 02 (E1): com desfecho final em todos os itens (preço comprovado ou pendência de
// estimativa), a solicitação sai de Estimativa para a revisão da Diretoria Administrativa.
// Ponte simulada no D1 local; nenhuma busca, WhatsApp ou mensagem real.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {budgetFixture} from './budget-fixture.mjs';
await build({stdin:{contents:"export * from './lib/integrations';export {transition} from './app/workflow';",resolveDir:process.cwd()},outfile:'outputs/partial-estimate-exit-test.mjs',bundle:true,platform:'node',format:'esm'});
await build({entryPoints:['app/workflow-panel.tsx'],outfile:'outputs/partial-estimate-exit-panel.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
await build({entryPoints:['app/budget-record-panel.tsx'],outfile:'outputs/partial-estimate-exit-record.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const api=await import('../outputs/partial-estimate-exit-test.mjs?'+Date.now());
const {default:Panel}=await import('../outputs/partial-estimate-exit-panel.mjs?'+Date.now());
const {BudgetRecordPanel}=await import('../outputs/partial-estimate-exit-record.mjs?'+Date.now());

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
const later=(at,minutes)=>new Date(Date.parse(at)+minutes*60000).toISOString();
try {
 const db=await mf.getD1Database('DB');
 const sql=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const s of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(s).run();
 const now='2026-11-26T12:00:00.000Z';
 await db.prepare('INSERT INTO school VALUES (1,?,?)').bind('test',JSON.stringify({minQuotes:1})).run();
 const found={name:'Assento sanitário Modelo Alfa',spec:'Branco',unit:'un',quantity:5},missing={name:'Peça rara Modelo Ômega',spec:'Cinza',unit:'un',quantity:2};
 const insert=async r=>db.prepare('INSERT INTO records VALUES (?,?,?,1)').bind(r.id,'request',JSON.stringify(r)).run();
 const request=id=>(api.rows(db,'request')).then(rs=>rs.find(r=>r.id===id));
 const source={title:'Assento sanitário Modelo Alfa branco',url:'https://example.com/product',description:'Fonte fictícia'};
 const analysis={status:'verified',sourceUrl:source.url,productName:source.title,productQuote:source.title,priceAmount:129.9,currency:'BRL',priceType:'total',priceQuote:'Preço R$ 129,90',packageQuantity:1,unit:'un',unitQuote:'Por unidade.',itemMatches:true,unitMatches:true,reason:'Produto, cor e unidade correspondem ao pedido.'};
 const verified=job=>({jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[source],analysisReason:'Produto correspondente.',priceEvidence:{origin:'public',analysis,url:source.url,title:source.title,text:source.title+'\nPreço R$ 129,90\nPor unidade.'}});
 const noPrice=job=>({jobId:job.id,leaseToken:job.leaseToken,outcome:'success',sources:[{...source,url:'https://example.com/other',title:'Outra peça'}],analysisReason:'Nenhuma página mostra preço por unidade.'});
 const claim=async(requestId,at)=>{for(;;){const j=await api.claimJob(db,{},at,false);if(!j)return null;if(j.requestId===requestId)return j}}; // tarefas de outras solicitações fictícias ficam em execução
 const byItem=async(requestId,at)=>{const a=await claim(requestId,at),b=await claim(requestId,at);return [a,b].sort((x,y)=>x.itemIndex-y.itemIndex)};

 // 1 item comprovado + 1 pendência: sai de Estimativa para a revisão da estimativa.
 await insert({id:'partial',status:'estimating',version:1,items:[found,missing],quotes:[]});
 await api.tick(db,{},now);
 let [a,b]=await byItem('partial',now);
 await api.completeJob(db,verified(a),now);
 assert.equal((await request('partial')).status,'estimating','um item ainda sem desfecho mantém Estimativa');
 await api.completeJob(db,noPrice(b),now);
 let saved=await request('partial');
 assert.equal(saved.status,'admin_review','termina na revisão da estimativa');
 assert.equal(saved.generalApproval,undefined);assert.equal(saved.adminReview,undefined,'nunca segue à Diretoria Geral automaticamente');
 assert.equal(saved.estimate.method,'automatic');assert.equal(saved.estimate.total,649.5,'subtotal dos itens com preço');
 const products=saved.estimate.lines.filter(l=>l.kind==='product');
 assert.deepEqual(products.map(l=>[l.itemIndex,l.origin,l.value]),[[0,'automatic',129.9],[1,'pending',null]]);
 assert.equal(products[1].reason,'Nenhuma página mostra preço por unidade.','pendência guarda o motivo');
 assert.equal(products[0].sourceUrl,source.url);assert.equal(products[0].author,'Sistema');
 const version=saved.version;await api.tick(db,{},now);assert.equal((await request('partial')).version,version,'sem nova transição no próximo ciclo');

 // Servidor recusa enviar à Diretoria Geral com pendência (fluxo antigo e formulário).
 const me={role:'administrativo',name:'ADM teste'};
 assert.throws(()=>api.transition(saved,{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now),/pendência de estimativa/i);
 const form={...budgetFixture('monthly'),id:'form',version:1,status:'admin_review',quotes:[],items:saved.items,estimate:saved.estimate};
 assert.throws(()=>api.transition(form,{action:'budget_management',submitToGeneral:true,data:{}},me,[],{},now),/pendência de estimativa/i);
 assert.throws(()=>api.transition({...saved,status:'general_review',adminReview:'ok'},{action:'approve',reason:'Aprovado pela DG.'},{role:'geral',name:'DG'},[],{},now),/pendência de estimativa/i);

 // Interface: pendência marcada com motivo e envio bloqueado.
 const data={me:{id:'adm',name:'ADM',email:'',role:'administrativo',department:'Administrativo'},integrations:{jobs:[]},suppliers:[],requests:[],members:[],activity:[],settings:{name:'Colégio Estrelas',legalName:'CEEA',minQuotes:3,departments:['Administrativo']}};
 let html=renderToStaticMarkup(createElement(Panel,{request:saved,data,busy:false,onSave:async()=>true,onDecision:()=>{}}));
 assert.match(html,/Pendência de estimativa/);assert.match(html,/Peça rara Modelo Ômega/);assert.match(html,/Nenhuma página mostra preço por unidade\./);
 assert.match(html,/<button[^>]*disabled=""[^>]*>Aprovar e encaminhar à diretoria geral/,'botão do fluxo antigo bloqueado');
 html=renderToStaticMarkup(createElement(BudgetRecordPanel,{request:form,data,busy:false,onSave:async()=>true,estimates:null}));
 assert.match(html,/<button[^>]*value="send_general"[^>]*disabled=""[^>]*>.*?Salvar e enviar para Diretoria Geral/s,'envio à DG bloqueado no formulário');
 assert.match(html,/pendência de estimativa/i);
 html=renderToStaticMarkup(createElement(BudgetRecordPanel,{request:{...form,estimate:{...form.estimate,lines:form.estimate.lines.map(l=>l.value===null&&l.kind==='product'?{...l,value:50,origin:'manual'}:l.kind==='freight'?{...l,value:0,origin:'manual'}:l)}},data,busy:false,onSave:async()=>true,estimates:null}));
 assert.doesNotMatch(html,/<button[^>]*value="send_general"[^>]*disabled=""/,'sem pendência (frete informado, ticket 06) o envio volta a ficar disponível');

 // Erro de infraestrutura em nova tentativa não é desfecho; esgotadas as tentativas, vira pendência.
 await insert({id:'retry',status:'estimating',version:1,items:[found,missing],quotes:[]});
 await api.tick(db,{},now);
 [a,b]=await byItem('retry',now);
 await api.completeJob(db,verified(a),now);
 let at=now;
 for(let attempt=1;attempt<=3;attempt++){
  const err={jobId:b.id,leaseToken:b.leaseToken,outcome:'error'};
  await api.completeJob(db,err,at);
  saved=await request('retry');
  if(attempt<3){assert.equal(saved.status,'estimating','tentativa '+attempt+' ainda não é desfecho');assert.equal(saved.estimate,undefined);at=later(at,60*attempt);b=await claim('retry',at)}
 }
 assert.equal(saved.status,'admin_review','tentativas esgotadas viram pendência');
 const failed=saved.estimate.lines.find(l=>l.kind==='product'&&l.itemIndex===1);
 assert.equal(failed.origin,'pending');assert.match(failed.reason,/Pesquisa indisponível/);

 // Resultado de revisão antiga não conta como desfecho.
 await insert({id:'stale',status:'estimating',version:1,items:[found,missing],quotes:[]});
 await api.tick(db,{},now);
 [a,b]=await byItem('stale',now);
 const current=await request('stale');
 await db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=?').bind(JSON.stringify({...current,estimateRevision:'nova-revisao'}),'stale').run();
 await api.completeJob(db,verified(a),now);await api.completeJob(db,noPrice(b),now);
 saved=await request('stale');
 assert.equal(saved.status,'estimating');assert.equal(saved.estimate,undefined,'resultados da revisão antiga não preenchem a atual');

 // Critérios substituídos: o resultado anterior não conta para a nova revisão do item.
 await insert({id:'criteria',status:'estimating',version:1,items:[found],quotes:[]});
 await api.tick(db,{},now);
 a=await claim('criteria',now);
 const crit=await request('criteria');
 await db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=?').bind(JSON.stringify({...crit,estimateCriteria:{0:{searchName:found.name,minimumRequirements:'Branco',allowSimilar:false,brandPolicy:'reference',brandModel:'',revision:'criterio-novo',actor:'ADM',at:now,sourceItem:found}}}),'criteria').run();
 await api.completeJob(db,noPrice(a),now);
 assert.equal((await request('criteria')).status,'estimating','critério antigo não conta como desfecho');

 // Assinaturas digitais continuam fora da estimativa automática.
 await insert({id:'digital',status:'estimating',version:1,items:[missing],quotes:[],form:{kind:'digital',fields:{referenceMonth:'2026-12'},references:[],accepted:true}});
 await api.tick(db,{},now);
 a=await claim('digital',now);await api.completeJob(db,noPrice(a),now);
 saved=await request('digital');assert.equal(saved.status,'estimating');assert.equal(saved.estimate,undefined);

 // Todos comprovados: mesmo resultado de antes, agora com linhas.
 await insert({id:'complete',status:'estimating',version:1,items:[found],quotes:[]});
 await api.tick(db,{},now);a=await claim('complete',now);await api.completeJob(db,verified(a),now);
 saved=await request('complete');
 assert.equal(saved.status,'admin_review');assert.equal(saved.estimate.total,649.5);assert.equal(saved.estimate.freightKnown,false);assert.equal(saved.estimate.freight,0);
 assert.deepEqual(saved.estimate.references.map(r=>r.unitPrice),[129.9],'campos antigos continuam preenchidos para os consumidores atuais');
 // Ticket 06: sem percentual configurado o frete fica pendente e impede o envio até ser informado.
 assert.throws(()=>api.transition(saved,{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now),/frete pendente/i);
 assert.doesNotThrow(()=>api.transition({...saved,estimate:{...saved.estimate,lines:saved.estimate.lines.map(l=>l.kind==='freight'?{...l,value:0,origin:'manual'}:l)}},{action:'admin_review',reason:'Encaminho para decisão.'},me,[],{},now));
 console.log('PASS: saída parcial da Estimativa, pendências com motivo, novas tentativas, revisões antigas, assinaturas e envio à DG bloqueado.');
}finally{await mf.dispose();}
