import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {localBase,localTestSession,testUsers} from './local-test-session.mjs';
assert.equal(localBase,'http://127.0.0.1:5185');
const master=await localTestSession(),sector=await localTestSession(testUsers[1]),general=await localTestSession(testUsers[2]);
const key=crypto.randomUUID().slice(0,8),phone='+55929'+String(Date.now()).slice(-8);
async function api(path,body,cookie=master,status=200,headers={}) {
 const response=await fetch(localBase+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:localBase,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await response.text();let result;try{result=JSON.parse(text)}catch{result={error:text}}assert.equal(response.status,status,path+': '+JSON.stringify(result));return result;
}
const snapshot=()=>api('/api/contacts');
const sending=(await api('/api/data')).integrations.sendingEnabled;assert.equal(sending,false);
const jobsBefore=(await api('/api/data')).integrations.jobs.length;
await api('/api/contacts',undefined,'',401);
for(const cookie of [sector,general]){await api('/api/contacts',undefined,cookie,403);await api('/api/contacts',{action:'request_sync'},cookie,403);}
const financeCredential=await api('/api/auth/users',{username:'dev.finance.agenda.'+key,name:'TESTE LOCAL Financeiro agenda',role:'financeiro',department:'Financeiro'});
const login=await fetch(localBase+'/api/auth/login',{method:'POST',headers:{Origin:localBase,'Content-Type':'application/json'},body:JSON.stringify({username:'dev.finance.agenda.'+key,password:financeCredential.temporaryPassword})});assert.equal(login.status,200);
const finance=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');await api('/api/contacts',undefined,finance,403);
const admName='dev.adm.agenda.'+key;
const admCredential=await api('/api/auth/users',{username:admName,name:'TESTE LOCAL ADM agenda',role:'administrativo',department:'Administrativo'});
const admLogin=await fetch(localBase+'/api/auth/login',{method:'POST',headers:{Origin:localBase,'Content-Type':'application/json'},body:JSON.stringify({username:admName,password:admCredential.temporaryPassword})});assert.equal(admLogin.status,200);
const adm=admLogin.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');await api('/api/contacts',undefined,adm);
await api('/api/contacts',null,master,400);
await api('/api/contacts',{action:'request_sync'},master,403,{Origin:'https://untrusted.example'});
await api('/api/contacts',{action:'import',contacts:[],padding:'X'.repeat(65000)},master,413);
await api('/api/contacts',{action:'import',contacts:[],source:{kind:'csv',label:'fake.csv'}},master,400);
await api('/api/contacts',{action:'import',contacts:Array(51).fill({name:'TESTE LOCAL',phone}),source:{kind:'csv',label:'fake.csv'}},master,400);
const draft={name:'TESTE LOCAL Agenda '+key,phone,category:'Materiais de construção',company:'Empresa fictícia'};
const imported=await api('/api/contacts',{action:'import',contacts:[draft],source:{kind:'csv',label:'ficticio.csv'}});assert.equal(imported.created,1);
assert.equal((await api('/api/data')).suppliers.some(s=>s.phone===phone),false);
let entry=(await snapshot()).entries.find(e=>e.phone===phone);assert.equal(entry.classification,'unclassified');assert.equal(entry.source.kind,'csv');
await api('/api/data',{action:'supplier',data:{name:'Não duplicar TESTE',phone,category:'Papelaria',contact:'',scope:'local'}},master,409);
await api('/api/contacts',{action:'save',id:entry.id,version:entry.version,classification:'supplier',data:draft},master,400);
await api('/api/contacts',{action:'save',id:entry.id,version:entry.version,classification:'supplier',data:{...draft,scope:'local'}});
assert.equal((await api('/api/data')).suppliers.find(s=>s.id===entry.id).category,draft.category);
await api('/api/contacts',{action:'save',id:entry.id,version:entry.version,classification:'supplier',data:{...draft,scope:'local'}},master,409);
const localVars=await readFile('.dev.vars','utf8');const secret=localVars.match(/^INTEGRATION_SECRET=(.+)$/m)[1].trim().replace(/^"|"$/g,'');
async function bridge(body,signed=true,status=200){const raw=JSON.stringify(body),timestamp=String(Date.now());const response=await fetch(localBase+'/api/integrations/bridge',{method:'POST',headers:{'Content-Type':'application/json','X-Estrelas-Timestamp':timestamp,'X-Estrelas-Signature':signed?'sha256='+createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex'):''},body:raw});const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;}
await bridge({op:'contact_sync_poll',protocol:'contacts-v1'},false,401);
const requested=await api('/api/contacts',{action:'request_sync'});
const {job}=await bridge({op:'contact_sync_poll',protocol:'contacts-v1'});assert.equal(job.syncId,requested.syncId);
const syncPhone='+55928'+String(Date.now()).slice(-8);
await bridge({op:'contact_sync_result',...job,page:0,contacts:[{name:'TESTE LOCAL Contato sincronizado '+key,phone:syncPhone}],done:true,counts:{candidates:1,skipped:0},warnings:[{source:'ingress',error:'source_unavailable'}]});
const preview=await snapshot();assert.equal(preview.bridgeReady,true);assert.equal(preview.sync.state,'review');assert.equal(preview.sync.warnings.length,1);assert.equal(JSON.stringify(preview).includes(job.leaseToken),false);
await api('/api/contacts',{action:'import_sync',syncId:job.syncId,phones:[phone]},master,409);
assert.equal((await api('/api/contacts',{action:'import_sync',syncId:job.syncId,phones:[syncPhone]})).created,1);
const after=await api('/api/data');assert.equal(after.integrations.sendingEnabled,false);assert.equal(after.integrations.jobs.length,jobsBefore);
// Only public fake local test identifiers for the browser validation, no cookies/secrets.
await writeFile('outputs/contact-agenda-fixture.json',JSON.stringify({entryId:entry.id,phone,key,syncPhone}));
await writeFile('outputs/agenda-ficticia.csv','Nome;Telefone;Empresa;Categoria\nTESTE LOCAL CSV '+key+';+5592998844001;Empresa fictícia;Papelaria\nTESTE LOCAL Duplicado;'+phone+';Empresa fictícia;Materiais de construção\nTESTE LOCAL Inválido;sem telefone;;\n');
console.log('PASS HTTP 5185: authentication, forbidden profiles, origin/body/batch limits, classification, stale edits, legacy dedupe, signed sync preview/import/privacy and no new jobs/sends.');
