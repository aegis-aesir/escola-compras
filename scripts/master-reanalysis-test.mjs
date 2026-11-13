import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {budgetFixture} from './budget-fixture.mjs';
await build({entryPoints:['app/workflow.ts'],outfile:'outputs/master-reanalysis.mjs',bundle:true,platform:'node',format:'esm'});
const {transition}=await import('../outputs/master-reanalysis.mjs?'+Date.now());
const now='2026-11-13T12:00:00Z',master={role:'admin',name:'Master TESTE'},action={action:'master_reanalysis',reason:'Reavaliar necessidade após conferência'};
for(const status of ['pending','estimating','admin_review','general_review','correction','deferred','rejected','quoting','national','execution','approved','ordered','received']){
 const old={...budgetFixture(),id:'test',code:'CE-TEST',version:1,status,authorId:'setor',authorName:'Setor TESTE',createdAt:now,quotes:[{id:'quote',supplierName:'TESTE',total:10}],selectedQuoteId:'quote',generalApproval:{actor:'Diretora',at:now,reason:'Autorizado'},adminReview:'Parecer anterior',management:{referenceMonth:'2026-12',contractedAmount:10,realizedAmount:10},archived:{actor:'Master',at:now,reason:'Arquivo'},localAttempts:[{note:'Contato anterior'}]};
 const before=structuredClone(old);for(const role of ['solicitante','administrativo','geral','financeiro'])assert.throws(()=>transition(old,action,{role,name:role},[],{},now),e=>e.status===403);
 const result=transition(old,action,master,[],{},now).data;
 assert.equal(result.status,'pending');assert.equal(result.authorId,'setor');assert.equal(result.id,old.id);assert.equal(result.archived,undefined);assert.equal(result.generalApproval,undefined);assert.equal(result.selectedQuoteId,undefined);assert.equal(result.management.realizedAmount,undefined);assert.equal(result.quotes.length,0);assert.deepEqual(result.reanalysisHistory[0].previous,old);assert.deepEqual(old,before);assert.equal(result.quoteHistory.length,1);
 const withEstimate=transition({...old,estimate:{total:10}},action,master,[],{},now).data;assert.equal(withEstimate.status,'admin_review');assert.equal(withEstimate.estimate.total,10);
}
console.log('PASS: reenvio exclusivo Master em todas as etapas, restauração, histórico completo e novas aprovações.');
