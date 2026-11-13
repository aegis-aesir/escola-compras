import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {localBase as base,localTestSession,testUsers} from './local-test-session.mjs';
import {budgetFixture} from './budget-fixture.mjs';

await build({entryPoints:['app/budget-fields.ts'],outfile:'outputs/return-draft-fields.mjs',bundle:true,platform:'node',format:'esm'});
const {managementSections}=await import('../outputs/return-draft-fields.mjs');
const [master,sector,general]=await Promise.all(testUsers.map(user=>localTestSession(user)));
const headers=cookie=>({Cookie:cookie,Origin:base,'Content-Type':'application/json'});
async function post(path,body,cookie=master,expected=200){const response=await fetch(base+path,{method:'POST',headers:headers(cookie),body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return data}
async function get(path,cookie=master,expected=200){const response=await fetch(base+path,{headers:headers(cookie)});const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return data}
async function createSession(role){const username=`teste.${role}.${String(Date.now()).slice(-6)}${Math.random().toString(16).slice(2,6)}`;const created=await post('/api/auth/users',{username,name:`TESTE LOCAL ${role}`,role,department:'Administrativo'});const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username,password:created.temporaryPassword})});assert.equal(response.status,200);return response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')}
const [otherSector,finance]=await Promise.all([createSession('solicitante'),createSession('financeiro')]);
const payload={...budgetFixture('monthly'),department:'Administrativo',title:'TESTE LOCAL devolução e adiamento '+Date.now()};
const {id}=await post('/api/data',{action:'request',data:payload},sector);
const current=async()=>{const data=await get('/api/data');return data.requests.find(request=>request.id===id)};
const act=async(action,extra={},cookie=master,expected=200)=>{const request=await current();return post('/api/data',{action,id,version:request.version,...extra},cookie,expected)};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
await act('estimate',{data:{references:payload.items.map(()=>({unitPrice:20,sourceName:'Fonte TESTE LOCAL',sourceUrl:'https://example.com/teste',researchedOn:today})),freight:0,notes:'Estimativa fictícia sem contato externo.'}});
const management=Object.fromEntries(managementSections('monthly').flatMap(section=>section.fields).filter(field=>field.key.startsWith('review')&&field.type==='select').map(field=>[field.key,'Sim']));
Object.assign(management,{quantityAssessment:'Adequadas',additionalDataStatus:'Não necessárias',recommendation:'Aprovar integralmente',validatedPriority:'Essencial'});
await act('budget_management',{data:management,submitToGeneral:true});
const pendingReason='Confirmar atendimento de todas as turmas antes da decisão';
await act('return_to_admin',{reason:pendingReason},sector,403);
await act('return_to_admin',{reason:pendingReason},general);
let request=await current();assert.equal(request.status,'admin_review');assert.equal(request.generalReturn.reason,pendingReason);assert.equal(request.generalReturnHistory[0].previousAdminReview!==undefined,true);
await act('budget_management',{data:management,submitToGeneral:true},master,400);
const response='Abrangência confirmada com a relação atualizada de todas as turmas';
await act('budget_management',{data:management,submitToGeneral:true,generalReturnResponse:response});
request=await current();assert.equal(request.status,'general_review');assert.equal(request.generalReturn,undefined);assert.equal(request.generalReturnHistory[0].response,response);
const generalReturned=(await get('/api/data',general)).requests.find(item=>item.id===id);assert.equal(generalReturned.generalReturnHistory[0].response,response,'a Diretoria Geral consulta a resposta e o histórico ao receber o pedido novamente');
const beforeDefer=request;
await act('decide_need',{choice:'defer',reason:'Reavaliar a necessidade no próximo mês',due:'2099-12-01'},general);
request=await current();assert.equal(request.status,'deferred');assert.equal(request.deferred.draftId,undefined);const originalSnapshot=structuredClone(request);
await post('/api/data',{action:'decide_need',id,version:beforeDefer.version,choice:'defer',reason:'Reavaliar a necessidade no próximo mês',due:'2099-12-01'},general,409);
assert.equal((await get('/api/drafts',sector)).drafts.some(draft=>draft.sourceRequestId===id),false);
let revision=await get('/api/deferred?id='+id,sector);await get('/api/deferred?id='+id,otherSector,403);await get('/api/deferred?id='+id,general,403);await get('/api/deferred?id='+id,finance,403);
const editedValues={...revision.values,title:revision.values.title+' editável pelo setor'};await post('/api/deferred',{id,version:revision.version,values:editedValues},sector);revision=await get('/api/deferred?id='+id,sector);assert.equal(revision.values.title,editedValues.title);assert.equal((await current()).title,originalSnapshot.title);
const file=new FormData();file.set('requestId',id);file.set('visibility','request');file.set('file',new File(['%PDF-1.4 TESTE LOCAL adiado'],'TESTE-LOCAL-adiado.pdf',{type:'application/pdf'}));const upload=await fetch(base+'/api/files',{method:'POST',headers:{Cookie:sector,Origin:base},body:file});assert.equal(upload.status,200,await upload.text());const fileId=(await get('/api/files?requestId='+id,sector)).files[0].id;const masterDownload=await fetch(base+'/api/files/'+fileId,{headers:headers(master)});assert.equal(masterDownload.status,200);
await post('/api/data',{action:'reapply_deferred',id,version:revision.version,roundAt:request.deferred.at,data:{...payload,title:editedValues.title}},sector,409);
await act('master_reanalysis',{reason:'Master solicitou nova análise do pedido original'});
request=await current();assert.equal(request.status,'admin_review');assert.equal(request.generalApproval,undefined);assert.equal(request.deferred,undefined);assert.equal(request.deferredEdit,undefined);assert.equal(request.reanalysisHistory[0].previous.deferredEdit.values.title,editedValues.title);
assert.equal((await get('/api/drafts?scope=all')).drafts.some(item=>item.sourceRequestId===id),false);
console.log('PASS HTTP: devolução e resposta administrativas, revisão privada no mesmo pedido, anexos, bloqueio mensal e reanálise com histórico. Sem mensagens reais.');
