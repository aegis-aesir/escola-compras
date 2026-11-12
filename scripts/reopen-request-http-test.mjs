import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {localBase as base,localTestSession,testUsers} from './local-test-session.mjs';
import {budgetFixture} from './budget-fixture.mjs';
await build({entryPoints:['app/budget-fields.ts'],outfile:'outputs/reopen-http-fields.mjs',bundle:true,platform:'node',format:'esm'});
const {managementSections}=await import('../outputs/reopen-http-fields.mjs');
const [master,sector,general]=await Promise.all(testUsers.map(u=>localTestSession(u)));
const headers=cookie=>({Cookie:cookie,'Content-Type':'application/json',Origin:base});
async function state(cookie=master){const r=await fetch(base+'/api/data',{headers:headers(cookie)});assert.equal(r.status,200);return r.json()}
async function post(body,cookie=master,status=200){const r=await fetch(base+'/api/data',{method:'POST',headers:headers(cookie),body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d}
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
for(const kind of ['monthly','emergency','digital']){
 const payload={...budgetFixture(kind),department:'Administrativo',title:'TESTE LOCAL reabertura '+kind+' '+Date.now()};
 const {id}=await post({action:'request',data:payload},sector);
 const current=async()=>(await state()).requests.find(r=>r.id===id);
 const act=async(action,extra={},cookie=master,status=200)=>post({action,id,version:(await current()).version,...extra},cookie,status);
 await act('estimate',{data:{references:payload.items.map(()=>({unitPrice:10,sourceName:'Fonte fictícia',sourceUrl:'https://example.com/teste',researchedOn:today})),freight:0,notes:'Estimativa fictícia, sem contato ou compra.'}});
 const management={...Object.fromEntries(managementSections(kind).flatMap(s=>s.fields).filter(f=>f.key.startsWith('review')&&f.type==='select').map(f=>[f.key,'Sim'])),quantityAssessment:'Adequadas',additionalDataStatus:'Não necessárias',recommendation:'Aprovar integralmente',validatedPriority:'Essencial',recommendedScope:'Escopo fictício do teste',analysis:'Análise anterior de teste',opinionReason:'Justificativa anterior',...(kind==='digital'?{technicalReview:'Concluída',technicalReviewer:'TI fictícia',technicalReviewDate:today}:{})};
 await act('budget_management',{data:management});await act('admin_review',{reason:'Parecer anterior da necessidade'});
 await act('decide_need',{choice:'reject',reason:'Recusa fictícia que precisa ficar no histórico'},general);
 const rejected=await current();assert.equal(rejected.status,'rejected');
 await act('reopen_request',{reason:'Reavaliar com novos esclarecimentos'},sector,403);await act('reopen_request',{reason:'Reavaliar com novos esclarecimentos'},general,403);
 await act('reopen_request',{reason:'curt'},master,400);
 await act('reopen_request',{reason:'Reavaliar com novos esclarecimentos'});
 await post({action:'reopen_request',id,version:rejected.version,reason:'Versão antiga não pode duplicar reabertura'},master,409);
 const reopened=await current();assert.equal(reopened.status,'admin_review');assert.equal(reopened.form.fields.referenceMonth,rejected.form.fields.referenceMonth);assert.deepEqual(reopened.items,rejected.items);assert.equal(reopened.reopeningHistory.length,1);assert.deepEqual(reopened.reopeningHistory[0].previous.needDecision,rejected.needDecision);assert.equal(reopened.needDecision,undefined);assert.equal(reopened.adminReview,undefined);
 const visible=(await state(sector)).requests.find(r=>r.id===id);assert.equal(visible.reopeningHistory[0].previous.management,undefined);
 assert.equal((await state()).activity.filter(a=>a.entity===id&&a.action.startsWith('Solicitação reaberta')).length,1);
 await act('admin_review',{reason:'Tentativa sem novo parecer'},master,400);await act('decide_need',{choice:'approve',reason:'Tentativa de pular análise'},general,400);
 await act('budget_management',{data:{...management,analysis:'Nova análise após esclarecimentos',opinionReason:'Nova justificativa da necessidade'}});await act('admin_review',{reason:'Novo parecer administrativo fundamentado'});
 await act('decide_need',{choice:'approve',reason:'Nova decisão da necessidade após reanálise'},general);assert.equal((await current()).status,'quoting');
}
console.log('PASS HTTP: three forms, DG refusal preserved, permissions, reason, version conflicts, audit, renewed administrative review and new DG approval. No supplier messages.');
