import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
await build({entryPoints:['app/workflow.ts','app/access.ts'],outdir:'outputs/request-archive',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {transition,localExpired}=await import('../outputs/request-archive/workflow.mjs');
const {visibleViews,visibleRequests}=await import('../outputs/request-archive/access.mjs');
const now='2026-11-11T15:00:00.000Z',master={role:'admin',name:'TESTE Master'},settings={minQuotes:1};
const request={id:'r',version:1,status:'quoting',items:[{quantity:1}],quotes:[{id:'q1',supplierId:'s1',supplierName:'Fictício',prices:[10],freight:0,deliveryDays:1,conditions:'Teste',validUntil:'2099-12-31',total:10}],generalApproval:{actor:'DG',at:now,reason:'Aprovada a necessidade'},localDeadline:'2026-11-10T15:00:00.000Z',executionNotes:[{actor:'Admin',at:now,note:'Histórico anterior'}],correctionHistory:[{reason:'Complementação anterior'}]};
const act=(r,action='archive_request',me=master,reason='Solicitação encerrada para consulta histórica')=>transition(r,{action,reason},me,[],settings,now);
test('arquiva toda a solicitação sem modificar estado, propostas, decisões ou históricos existentes',()=>{
 const result=act(request);const {archived,archiveHistory,updatedAt,...preserved}=result.data;
 assert.deepEqual(preserved,request);assert.equal(archived.actor,master.name);assert.equal(archived.at,now);assert.equal(archiveHistory.length,1);assert.equal(request.archived,undefined);assert.match(result.action,/Solicitação arquivada/);assert.equal(localExpired(result.data,now),false);
});
test('somente Master arquiva/restaura, exige motivo e impede duplicidade',()=>{
 for(const role of ['administrativo','financeiro','geral','solicitante'])for(const action of ['archive_request','restore_request'])assert.throws(()=>act(request,action,{role,name:role}),e=>e.status===403);
 assert.throws(()=>act(request,'archive_request',master,'curt'));
 assert.throws(()=>act(act(request).data),e=>e.status===409);
 assert.throws(()=>act(request,'restore_request'),e=>e.status===409);
});
test('arquivada bloqueia todas as alterações de fluxo e restauração mantém história e aprovação originais',()=>{
 const archived=act(request).data;
 for(const action of ['estimate','quote','select','local_contact','budget_management','decide_need','reopen_request','execution_note'])assert.throws(()=>transition(archived,{action,reason:'Tentativa fictícia'},master,[],settings,now),e=>e.status===409&&/arquivad/i.test(e.message));
 const restored=act(archived,'restore_request').data;assert.equal(restored.archived,undefined);assert.deepEqual(restored.quotes,request.quotes);assert.deepEqual(restored.generalApproval,request.generalApproval);assert.equal(restored.status,request.status);assert.deepEqual(restored.archiveHistory.map(e=>e.action),['archive','restore']);
});
test('arquivamento por proposta removido; arquivo de solicitações exclusivo do Master e fora da aprovação DG',()=>{
 for(const action of ['archive_quote','restore_quote'])assert.throws(()=>transition(request,{action,quoteId:'q1',reason:'Ação antiga removida'},master,[],settings,now),/desconhecida/);
 assert.ok(visibleViews('admin').includes('archives'));
 for(const role of ['administrativo','financeiro','geral','solicitante'])assert.ok(!visibleViews(role).includes('archives'));
 assert.equal(visibleRequests([{...request,status:'general_review',archived:{at:now}}],{id:'DG',role:'geral'}).length,0);
});
