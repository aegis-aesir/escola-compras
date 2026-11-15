import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {localBase,localTestSession,testUsers} from './local-test-session.mjs';
assert.equal(localBase,'http://127.0.0.1:5185','Este teste usa exclusivamente a worktree Compras');
const master=await localTestSession(),sector=await localTestSession(testUsers[1]),general=await localTestSession(testUsers[2]);
const key=crypto.randomUUID().slice(0,8),phone='+55927'+String(Date.now()).slice(-8),reason='TESTE LOCAL Exclusão recuperável '+key;
async function api(body,cookie=master,status=200,headers={}){
 const response=await fetch(localBase+'/api/contacts',{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:localBase,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const raw=await response.text();assert.equal(response.status,status,raw);if(!response.headers.get('content-type')?.includes('application/json')){assert.equal(status,403);return {error:raw};}return JSON.parse(raw);
}
async function data(){const response=await fetch(localBase+'/api/data',{headers:{Cookie:master}});assert.equal(response.status,200);return response.json()}
const before=await data();assert.equal(before.integrations.sendingEnabled,false);
const draft={name:'TESTE LOCAL Contato removível '+key,phone,category:'Papelaria',scope:'local',contact:'Fictício'};
const saved=await api({action:'save',classification:'supplier',data:draft});
const payload={id:saved.id,version:saved.version,reason};
for(const action of ['remove','restore']){
 await api({action,...payload},'',401);
 for(const cookie of [sector,general])await api({action,...payload},cookie,403);
 await api({action,...payload},master,403,{Origin:'https://untrusted.example'});
 for(const invalid of [{reason:'x'},{version:0},{id:'invalid'},{reason:undefined},{version:undefined}])await api({action,...payload,...invalid},master,400);
}
const removed=await api({action:'remove',...payload});assert.equal(removed.version,2);
let snapshot=await api();assert.equal(snapshot.entries.some(e=>e.id===saved.id),false);
const trash=snapshot.removedEntries.find(e=>e.id===saved.id);assert.equal(trash.name,draft.name);assert.equal(trash.removed.reason,reason);assert.equal(trash.version,2);
assert.equal((await data()).suppliers.find(s=>s.id===saved.id).name,draft.name,'supplier remains available for historical name resolution');
await api({action:'save',id:saved.id,version:2,classification:'supplier',data:draft},master,409);
const imported=await api({action:'import',contacts:[draft],source:{kind:'csv',label:'fixture-removal.csv'}});assert.equal(imported.existing,1);assert.equal(imported.results[0].id,saved.id);
await api({action:'restore',...payload},master,409);
await api({action:'restore',...payload,version:2});
snapshot=await api();assert.equal(snapshot.entries.find(e=>e.id===saved.id).version,3);assert.equal(snapshot.removedEntries.some(e=>e.id===saved.id),false);
const race=await Promise.all([1,2].map(async()=>{const response=await fetch(localBase+'/api/contacts',{method:'POST',headers:{Cookie:master,Origin:localBase,'Content-Type':'application/json'},body:JSON.stringify({action:'remove',...payload,version:3})});return response.status}));
assert.deepEqual(race.sort(),[200,409]);
await api({action:'restore',...payload,version:4});
const after=await data();assert.equal(after.integrations.sendingEnabled,false);assert.deepEqual(after.integrations.jobs,before.integrations.jobs,'contact operations create, reopen or dispatch no jobs');
await writeFile('outputs/contact-removal-fixture.json',JSON.stringify({id:saved.id,name:draft.name,phone,version:5}));
console.log('PASS HTTP 5185 contact removal: local fake supplier, authentication/roles, origin, reason/version, trash/restore, import dedupe, CAS and historical identity. No jobs/sends.');
