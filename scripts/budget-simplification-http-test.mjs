import assert from 'node:assert/strict';
import {localBase as base,localTestSession,testUsers} from './local-test-session.mjs';
import {simplifiedBudgetFixture} from './budget-fixture.mjs';
const [master,sector]=await Promise.all([localTestSession(testUsers[0]),localTestSession(testUsers[1])]);
async function post(cookie,body,status=200){const r=await fetch(base+'/api/data',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
async function current(id,cookie=master){const r=await fetch(base+'/api/data',{headers:{Cookie:cookie}});assert.equal(r.status,200);return (await r.json()).requests.find(r=>r.id===id);}
for(const kind of ['monthly','emergency','digital']){
  const value=simplifiedBudgetFixture(kind);value.department='Administrativo';value.title='TESTE LOCAL simplificado '+kind+' '+Date.now();
  value.form.fields.referenceMonth='2099-01';value.form.fields.originalRequestId='FALSO';
  const start=new Date(Date.now()-4*60*60*1000).toISOString().slice(0,7);
  const {id}=await post(sector,{action:'request',data:value});const r=await current(id);
  const end=new Date(Date.now()-4*60*60*1000).toISOString().slice(0,7);
  assert.ok([start,end].includes(r.form.fields.referenceMonth));
  assert.equal(r.form.version,2);assert.equal(r.form.fields.classification,'Prevista pontual');assert.equal(r.form.fields.originalRequestId,undefined);
  assert.equal(r.form.fields.situation,'Nova');assert.deepEqual(r.form.references,[]);
  await post(master,{action:'return_request',id,version:r.version,reason:'Complementar especificação para validar novo formulário.',due:'2099-12-20'});
  let returned=await current(id);
  await post(sector,{action:'resubmit_request',id,version:returned.version,data:value},400);
  value.form.fields.correctionResponse='Especificação complementada no teste fictício.';
  await post(sector,{action:'resubmit_request',id,version:returned.version,data:value});
  const after=await current(id),own=await current(id,sector);
  assert.equal(after.form.fields.referenceMonth,r.form.fields.referenceMonth);
  assert.equal(after.form.fields.originalRequestId,r.code);
  assert.equal(after.form.fields.situation,'Complementação');assert.equal(after.correctionHistory.length,1);
  assert.equal(own.management,undefined);assert.equal(own.estimate,undefined);
  const invalid=structuredClone(value);delete invalid.form.fields.classification;
  await post(sector,{action:'request',data:invalid},400);
}
console.log('PASS HTTP: três formulários simplificados, mês Manaus do servidor, identificação protegida, complementação, histórico e privacidade. Sem mensagens reais.');
