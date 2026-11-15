import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localBase,localTestSession,testUsers} from './local-test-session.mjs';
assert.match(localBase,/^http:\/\/127\.0\.0\.1:(5173|5185)$/,'Somente o ambiente local do coordenador ou Compras');
// The prerequisite creates only fictitious recipients and approved requests locally.
await import('./quotation-contacts-http-test.mjs');
const {requestId}=JSON.parse(await readFile('outputs/quotation-contacts-fixture.json','utf8'));
const master=await localTestSession(),sector=await localTestSession(testUsers[1]),general=await localTestSession(testUsers[2]);
async function api(body,cookie=master,status=200){const r=await fetch(localBase+'/api/data',{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:localBase,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result;}
const before=await api(),jobs=before.integrations.jobs.filter(j=>j.requestId===requestId&&j.type==='whatsapp_quote'),selected=jobs.slice(0,2).map(({id,version})=>({id,version}));assert.equal(jobs.length,3);
const action={action:'cancel_quotation_jobs',jobs:selected,reason:'TESTE LOCAL cancelamento explícito preservando o terceiro contato'};
await api(action,sector,403);await api(action,general,403);await api({...action,reason:''},master,400);await api({...action,jobs:selected.map(j=>({...j,version:j.version+1}))},master,409);
assert.deepEqual((await api()).integrations.jobs,before.integrations.jobs);
assert.equal((await api(action)).cancelled,2);const after=await api();assert.equal(after.integrations.sendingEnabled,false);
for(const old of before.integrations.jobs){const current=after.integrations.jobs.find(j=>j.id===old.id);if(selected.some(s=>s.id===old.id)){assert.equal(current.state,'cancelled');assert.equal(current.message,old.message);assert.equal(current.attempts,0);assert.equal(current.version,old.version+1);}else assert.deepEqual(current,old);}
await api(action,master,409);
console.log('PASS HTTP: authenticated explicit cancellation, role denial, required reason, stale version, global sends off, other local tasks unchanged.');
