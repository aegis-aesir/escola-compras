import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {localBase,localTestSession,testUsers} from './local-test-session.mjs';
import {simplifiedBudgetFixture} from './budget-fixture.mjs';
assert.match(localBase,/^http:\/\/127\.0\.0\.1:(5173|5185)$/,'Somente o ambiente local do coordenador ou Compras');
const master=await localTestSession(),general=await localTestSession(testUsers[2]),sector=await localTestSession(testUsers[1]);
async function api(path,body,cookie=master,status=200){const r=await fetch(localBase+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:localBase,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result;}
const data=()=>api('/api/data'),key=crypto.randomUUID().slice(0,8),digits=String(Date.now()).slice(-7),phone=n=>'+55929'+digits+n;
const before=await data();assert.equal(before.integrations.sendingEnabled,false);
const get=async id=>(await data()).requests.find(r=>r.id===id);
const act=async(id,action,extra={},status=200,cookie=master)=>api('/api/data',{action,id,version:(await get(id)).version,...extra},cookie,status);
const relevant=await api('/api/contacts',{action:'save',classification:'supplier',data:{name:'TESTE LOCAL Sugerido '+key,phone:phone(1),category:'Materiais de construção',scope:'local'}});
const other=await api('/api/contacts',{action:'save',classification:'supplier',data:{name:'TESTE LOCAL Outro segmento '+key,phone:phone(2),category:'Alimentos',scope:'national'}});
const contact=await api('/api/contacts',{action:'save',classification:'general',data:{name:'TESTE LOCAL Contato geral '+key,phone:phone(3)}});
await api('/api/contacts',{action:'import',source:{kind:'csv',label:'paginacao-ficticia.csv'},contacts:Array.from({length:30},(_,i)=>({name:'TESTE LOCAL Paginação '+String(i+1).padStart(2,'0'),phone:'+55119888'+String(i).padStart(5,'0')}))});
const fixture={...simplifiedBudgetFixture(),department:'Administrativo',title:'TESTE LOCAL seleção manual '+key};fixture.items=[{...fixture.items[0],name:'Registro para mictório TESTE '+key,category:'Manutenção',quantity:4,unit:'un.'}];
const {id}=await api('/api/data',{action:'request',data:fixture});
const path='/api/contacts?quotationRequestId='+id;
await api(path,undefined,'',401);await api(path,undefined,sector,403);await api(path,undefined,general,403);await api(path,undefined,master,409);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
await act(id,'estimate',{data:{references:[{unitPrice:10,sourceName:'Fonte fictícia',sourceUrl:'https://example.com/fake',researchedOn:today}],freight:0,notes:'Teste local sem pesquisa externa'}});
await act(id,'budget_management',{submitToGeneral:true,data:{quantityAssessment:'Adequadas',additionalDataStatus:'Não necessárias',recommendation:'Aprovar integralmente',validatedPriority:'Essencial'}});
await act(id,'decide_need',{choice:'approve',reason:'Teste local da seleção de contatos'},200,general);
const secret=(await readFile('.dev.vars','utf8')).match(/^INTEGRATION_SECRET=(.+)$/m)[1].trim().replace(/^"|"$/g,'');
async function bridge(body){const raw=JSON.stringify(body),ts=String(Date.now());const r=await fetch(localBase+'/api/integrations/bridge',{method:'POST',headers:{'Content-Type':'application/json','X-Estrelas-Timestamp':ts,'X-Estrelas-Signature':'sha256='+createHmac('sha256',secret).update(ts+'.'+raw).digest('hex')},body:raw});assert.equal(r.status,200);return r.json();}
await api('/api/contacts',{action:'request_sync'});const {job}=await bridge({op:'contact_sync_poll',protocol:'contacts-v1'});
await bridge({op:'contact_sync_result',...job,page:0,contacts:[{name:'TESTE LOCAL Prévia '+key,phone:phone(4)},{name:'TESTE LOCAL Não importar '+key,phone:phone(5)}],done:true});
const snapshot=await api(path);const pick=id=>snapshot.choices.find(c=>c.selection.id===id);
assert.ok(snapshot.choices.length>25,'complete list can be paginated without losing recipients');
assert.equal(pick(relevant.id).recommended,true);assert.equal(pick(other.id).recommended,false);assert.equal(pick(contact.id).recommended,false);
const preview=snapshot.choices.find(c=>c.selection.kind==='sync'&&c.phone===phone(4));assert.ok(preview);
await act(id,'prepare_openclaw',{supplierIds:[other.id]},409);
await act(id,'prepare_openclaw',{recipients:[{...pick(contact.id).selection,phone:phone(9)}]},409);
await act(id,'prepare_openclaw',{recipients:[pick(contact.id).selection]},403,sector);
const selected=[pick(other.id).selection,pick(contact.id).selection,preview.selection];
await act(id,'prepare_openclaw',{recipients:selected});
await act(id,'prepare_openclaw',{recipients:selected}); // Same preview refs remain idempotent after selected-only import.
// Reload after selected preview contacts become stable agenda entries.
const refreshed=await api(path);const selectedAgain=selected.map(s=>s.kind==='saved'?s:refreshed.choices.find(c=>c.phone===s.phone).selection);
await act(id,'prepare_openclaw',{recipients:selectedAgain});
const after=await data(),jobs=after.integrations.jobs.filter(j=>j.requestId===id&&j.type==='whatsapp_quote');assert.equal(jobs.length,3);assert.ok(jobs.every(j=>j.state==='blocked'&&j.attempts===0));assert.equal(after.integrations.sendingEnabled,false);
assert.equal(after.suppliers.some(s=>s.phone===phone(3)||s.phone===phone(4)),false);
const agenda=await api('/api/contacts');assert.equal(agenda.entries.some(c=>c.phone===phone(4)&&c.classification==='unclassified'),true);assert.equal(agenda.entries.some(c=>c.phone===phone(5)),false);
for(const old of before.integrations.jobs.filter(j=>j.type==='whatsapp_quote'))assert.deepEqual(after.integrations.jobs.find(j=>j.id===old.id),old);
await writeFile('outputs/quotation-contacts-fixture.json',JSON.stringify({requestId:id,key,contactId:contact.id,relevantId:relevant.id}));
console.log(`PASS HTTP ${localBase}: complete list/preview, suggestions, manual contacts, permissions, forged refs, blocked/idempotent jobs, selected-only save and old tasks unchanged.`);
