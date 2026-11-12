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
request=await current();assert.equal(request.status,'deferred');assert.ok(request.deferred.draftId);const originalSnapshot=structuredClone(request);
await post('/api/data',{action:'decide_need',id,version:beforeDefer.version,choice:'defer',reason:'Reavaliar a necessidade no próximo mês',due:'2099-12-01'},general,409);
const sectorDrafts=await get('/api/drafts',sector);const copies=sectorDrafts.drafts.filter(draft=>draft.sourceRequestId===id);assert.equal(copies.length,1);let draft=copies[0];assert.equal(draft.status,'deferred');assert.equal(draft.sourceCode,request.code);assert.equal(draft.deferReason,'Reavaliar a necessidade no próximo mês');
assert.equal((await get('/api/drafts',otherSector)).drafts.some(item=>item.id===draft.id),false);await get('/api/drafts',general,403);await get('/api/drafts',finance,403);assert.equal((await get('/api/drafts',master)).drafts.some(item=>item.id===draft.id),false);
const editedValues={...draft.values,title:draft.values.title+' editável pelo setor'};await post('/api/drafts',{id:draft.id,version:draft.version,values:editedValues},sector);draft=(await get('/api/drafts',sector)).drafts.find(item=>item.id===draft.id);assert.equal(draft.status,'deferred');assert.equal(draft.sourceRequestId,id);assert.equal(draft.deferReason,'Reavaliar a necessidade no próximo mês');assert.equal(draft.values.title,editedValues.title);
const file=new FormData();file.set('requestId',draft.id);file.set('visibility','request');file.set('file',new File(['%PDF-1.4 TESTE LOCAL adiado'],'TESTE-LOCAL-adiado.pdf',{type:'application/pdf'}));const upload=await fetch(base+'/api/files',{method:'POST',headers:{Cookie:sector,Origin:base},body:file});assert.equal(upload.status,200,await upload.text());const fileId=(await get('/api/files?requestId='+draft.id,sector)).files[0].id;await get('/api/files/'+fileId,master,404);
await post('/api/data',{action:'request',data:{...payload,title:editedValues.title},draftId:draft.id,draftVersion:draft.version},sector,409);
assert.deepEqual(await current(),originalSnapshot,'o pedido original continua adiado e não é convertido em rascunho');
console.log('PASS HTTP: devolução e resposta administrativas, cópia adiada única/privada/editável, anexo próprio e bloqueio mensal. No external messages.');
