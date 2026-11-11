import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {budgetFixture} from './budget-fixture.mjs';
await build({entryPoints:['app/workflow.ts','app/access.ts'],outdir:'outputs/reopen-request',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {transition}=await import('../outputs/reopen-request/workflow.mjs');
const {visibleRequests}=await import('../outputs/reopen-request/access.mjs');
const now='2026-11-11T15:00:00.000Z',settings={minQuotes:3,holidays:[]};
const admin={id:'master',role:'admin',name:'TESTE LOCAL Master'},administrative={...admin,role:'administrativo'},general={id:'dg',role:'geral',name:'DG teste'},sector={id:'setor',role:'solicitante',name:'Setor teste'};
const request=(kind='monthly')=>({...budgetFixture(kind),id:'r',version:1,authorId:'setor',status:'rejected',createdAt:'2026-11-10T12:00:00.000Z',quotes:[],decision:'Não aprovado por falta de necessidade',needDecision:{choice:'reject',itemIndexes:[],reason:'Não aprovado por falta de necessidade',actor:'Diretora teste',at:'2026-11-10T15:00:00.000Z'},estimate:{total:30,freight:0,references:[{unitPrice:10}]},adminReview:'Parecer anterior',management:{recommendation:'Aprovar integralmente',analysis:'Análise anterior',opinionReason:'Parecer anterior',financialNotes:'Interno preservado'}});
const reopen=(r,me=admin,reason='Novos esclarecimentos permitem reavaliar a necessidade')=>transition(r,{action:'reopen_request',reason},me,[],settings,now);

test('reabertura retorna à análise administrativa, preservando recusa e dados originais',()=>{
 for(const kind of ['monthly','emergency','digital'])for(const me of [admin,administrative]){
  const old=request(kind),snapshot=structuredClone(old),result=reopen(old,me),r=result.data;
  assert.equal(r.status,'admin_review');assert.equal(r.id,old.id);assert.deepEqual(r.items,old.items);assert.deepEqual(r.form,old.form);assert.deepEqual(r.estimate,old.estimate);assert.equal(r.createdAt,old.createdAt);
  assert.equal(r.decision,undefined);assert.equal(r.needDecision,undefined);assert.equal(r.adminReview,undefined);assert.equal(r.generalApproval,undefined);
  assert.equal(r.management.recommendation,undefined);assert.equal(r.management.analysis,undefined);assert.equal(r.management.opinionReason,undefined);assert.equal(r.management.financialNotes,old.management.financialNotes);
  const history=r.reopeningHistory[0];assert.equal(history.actor,me.name);assert.equal(history.at,now);assert.deepEqual(history.previous.needDecision,old.needDecision);assert.deepEqual(history.previous.management,old.management);assert.equal(history.previous.decision,old.decision);assert.match(result.action,/reabert/i);assert.deepEqual(old,snapshot,'não altera o objeto original');
  assert.throws(()=>transition(r,{action:'decide_need',choice:'approve',reason:'Tentativa sem novo parecer'},general,[],settings,now));
 }
});
test('setor e DG não reabrem, e justificativa/etapa são obrigatórias',()=>{
 for(const role of [sector,general])assert.throws(()=>reopen(request(),role),e=>e.status===403);
 for(const reason of ['', 'curt', 'x'.repeat(2001)])assert.throws(()=>reopen(request(),admin,reason));
 for(const status of ['estimating','admin_review','general_review','deferred','quoting','execution','ordered','received'])assert.throws(()=>reopen({...request(),status}));
 assert.throws(()=>reopen({...request(),generalApproval:{actor:'DG',at:now,reason:'Aprovado'}}));
});
test('recusa administrativa legada sem estimativa retorna à pesquisa sem fabricar aprovação',()=>{
 const r=request();delete r.form;delete r.estimate;delete r.needDecision;
 const opened=reopen(r).data;assert.equal(opened.status,'pending');assert.equal(opened.estimateRevision,now);assert.equal(opened.estimate,undefined);assert.equal(opened.reopeningHistory[0].previous.decision,r.decision);
});
test('nova recusa e reabertura acumulam histórico sem reutilizar a decisão anterior',()=>{
 const first=reopen(request()).data;
 const rejected=transition(first,{action:'reject',reason:'Nova recusa administrativa fundamentada'},admin,[],settings,now).data;
 const second=reopen(rejected).data;assert.equal(second.reopeningHistory.length,2);assert.equal(second.reopeningHistory[0].previous.needDecision.reason,request().needDecision.reason);assert.equal(second.reopeningHistory[1].previous.decision,rejected.decision);assert.equal(second.decision,undefined);
});
test('projeções do setor e DG mostram reabertura sem vazar controles internos anteriores',()=>{
 const r={...reopen(request()).data,status:'general_review'};
 for(const me of [sector,general]){
  const view=visibleRequests([r],me)[0],entry=view.reopeningHistory[0];assert.ok(entry.reason);assert.equal(entry.previous.needDecision.reason,request().needDecision.reason);assert.equal(entry.previous.management,undefined);assert.equal(entry.previous.adminReview,undefined);assert.equal(entry.previous.estimate,undefined);
 }
});
