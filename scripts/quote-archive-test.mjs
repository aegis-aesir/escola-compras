import assert from 'node:assert/strict';import test from 'node:test';import {build} from 'esbuild';
await build({entryPoints:['app/workflow.ts','app/quote-comparison.ts'],outdir:'outputs/quote-archive',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {transition,localExpired}=await import('../outputs/quote-archive/workflow.mjs');const {quoteComparable}=await import('../outputs/quote-archive/quote-comparison.mjs');
const now='2026-11-11T15:00:00.000Z',settings={minQuotes:1},master={role:'admin',name:'TESTE Master'};
const quote={id:'q1',supplierId:'s1',supplierName:'Fornecedor teste',prices:[10],freight:0,deliveryDays:1,conditions:'Fictício',validUntil:'2099-12-31',total:10};
const request={id:'r',version:1,status:'quoting',items:[{quantity:1}],quotes:[quote],generalApproval:{actor:'DG',at:now,reason:'Necessidade aprovada'},localDeadline:'2026-11-10T15:00:00.000Z'};
const act=(r,action='archive_quote',me=master,reason='Proposta substituída por revisão do fornecedor')=>transition(r,{action,quoteId:'q1',reason},me,[],settings,now);
test('Master arquiva sem apagar cotação nem alterar etapa e registra autoria/motivo',()=>{
 const archived=act(request);const q=archived.data.quotes[0];assert.equal(archived.data.status,request.status);assert.equal(q.total,quote.total);assert.equal(q.archived.actor,master.name);assert.equal(q.archived.at,now);assert.ok(q.archived.reason);assert.equal(q.archiveHistory.length,1);assert.equal(request.quotes[0].archived,undefined);assert.match(archived.action,/arquivad/i);
 assert.equal(quoteComparable(q),false);assert.equal(localExpired(archived.data,now),true);assert.throws(()=>transition(archived.data,{action:'select',quoteId:'q1',reason:'Tentativa de usar proposta arquivada'},master,[],settings,now));
});
test('somente Master arquiva/restaura; protege proposta selecionada e exige motivo',()=>{
 for(const role of ['administrativo','financeiro','geral','solicitante'])for(const action of ['archive_quote','restore_quote'])assert.throws(()=>act(request,action,{role,name:role}),e=>e.status===403);
 assert.throws(()=>act({...request,selectedQuoteId:'q1'}));assert.throws(()=>act(request,'archive_quote',master,'curt'));assert.throws(()=>transition(request,{action:'archive_quote',quoteId:'inexistente',reason:'Tentativa de ID inválido'},master,[],settings,now));
});
test('restauração preserva histórico, não aprova compra e respeita validade original',()=>{
 const archived=act(request).data;assert.throws(()=>act(archived),e=>e.status===409);
 const restored=act(archived,'restore_quote').data;assert.equal(restored.quotes[0].archived,undefined);assert.deepEqual(restored.quotes[0].archiveHistory.map(e=>e.action),['archive','restore']);assert.equal(restored.selectedQuoteId,undefined);assert.equal(restored.quotes[0].validUntil,quote.validUntil);assert.equal(quoteComparable(restored.quotes[0]),true);assert.throws(()=>act(restored,'restore_quote'),e=>e.status===409);
});
test('nova proposta do mesmo fornecedor preserva a arquivada e impede duplicidade ativa ao restaurar',()=>{
 const supplierId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',supplier={id:supplierId,name:'Fornecedor teste',scope:'local'};
 const initial={...request,quotes:[{...quote,supplierId}]},archived=act(initial).data;
 const replacement=transition(archived,{action:'quote',data:{supplierId,prices:[12],freight:0,deliveryDays:2,conditions:'Nova proposta fictícia',validUntil:'2099-12-31'}},master,[supplier],settings,now).data;
 assert.equal(replacement.quotes.length,2);assert.ok(replacement.quotes.find(q=>q.id==='q1').archived);assert.throws(()=>act(replacement,'restore_quote'),/ativa.*fornecedor|fornecedor.*ativa/i);
});
