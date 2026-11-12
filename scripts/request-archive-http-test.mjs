import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {prepareFinanceFixture} from './finance-profile-http-test.mjs';import {localBase as base} from './local-test-session.mjs';
export async function prepareRequestArchiveFixture(){
 const f=await prepareFinanceFixture(),headers=cookie=>({Cookie:cookie,Origin:base,'Content-Type':'application/json'});
 async function state(){const r=await fetch(base+'/api/data',{headers:headers(f.masterCookie)});assert.equal(r.status,200);return r.json()}
 async function post(path,body,cookie=f.masterCookie,status=200){const r=await fetch(base+path,{method:'POST',headers:headers(cookie),body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return {r,d}}
 const current=async()=>(await state()).requests.find(r=>r.id===f.requestId);
 const act=async(action,extra={},cookie=f.masterCookie,status=200)=>post('/api/data',{action,id:f.requestId,version:(await current()).version,...extra},cookie,status);
 await build({entryPoints:['app/budget-fields.ts'],outfile:'outputs/request-archive-http-fields.mjs',bundle:true,platform:'node',format:'esm'});const {managementSections}=await import('../outputs/request-archive-http-fields.mjs');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
 await act('estimate',{data:{references:[{unitPrice:10,sourceName:'Fonte fictícia',sourceUrl:'https://example.com/teste',researchedOn:today}],freight:0,notes:'Pesquisa fictícia sem contato externo.'}});
 const review={...Object.fromEntries(managementSections('monthly').flatMap(s=>s.fields).filter(f=>f.key.startsWith('review')&&f.type==='select').map(f=>[f.key,'Sim'])),quantityAssessment:'Adequadas',additionalDataStatus:'Não necessárias',recommendation:'Aprovar integralmente',validatedPriority:'Essencial',recommendedScope:'Escopo fictício',analysis:'Necessidade conferida no teste',opinionReason:'Justificativa fictícia'};
 await act('budget_management',{data:review});await act('admin_review',{reason:'Parecer fictício para teste'});await act('decide_need',{choice:'approve',reason:'Necessidade fictícia aprovada, sem teto de valor'});
 for(let i=0;i<3;i++){const {d:{id:supplierId}}=await post('/api/data',{action:'supplier',data:{name:'TESTE LOCAL arquivo fornecedor '+i+' '+Date.now(),category:'Papelaria',phone:'5592999990000',contact:'Contato fictício',scope:'local'}});await act('quote',{data:{supplierId,prices:[10+i],coverage:[3],comparable:true,currency:'BRL',priceBasis:'term',freight:0,otherExpenses:0,deliveryDays:2,conditions:'Proposta fictícia sem envio real',validUntil:'2099-12-31'}});}
 const initial=await current(),first=initial.quotes[0];
 await act('select',{quoteId:first.id,reason:'Menor proposta válida para execução'});
 const username='admin.archive.'+Date.now();const {d:credential}=await post('/api/auth/users',{username,name:'TESTE LOCAL Administrativo',role:'administrativo',department:'Administrativo'});const {r:login}=await post('/api/auth/login',{username,password:credential.temporaryPassword});const adminCookie=login.headers.get('set-cookie').split(';')[0];
 const before=await current(),beforeState=await state();
 for(const cookie of [adminCookie,f.financeCookie])await act('archive_request',{reason:'Tentativa sem acesso Master'},cookie,403);
 await act('archive_quote',{quoteId:first.id,reason:'Ação antiga removida'},f.masterCookie,400);
 await act('archive_request',{reason:'Solicitação inteira arquivada no teste'});
 const archived=await current();assert.ok(archived.archived);assert.equal(archived.status,before.status);assert.deepEqual(archived.quotes,before.quotes);assert.deepEqual(archived.generalApproval,before.generalApproval);assert.deepEqual(archived.form,before.form);assert.equal(archived.selectedQuoteId,first.id);
 const afterState=await state();assert.deepEqual(afterState.budgetRecords,beforeState.budgetRecords);assert.equal(afterState.integrations.sendingEnabled,false);
 for(const action of ['ordered','quote','budget_management','research','resubmit_request'])await act(action,{reason:'Tentativa de alterar arquivo',data:{}},f.masterCookie,409);
 await post('/api/data',{action:'archive_request',id:f.requestId,version:before.version,reason:'Versão antiga não pode duplicar'},f.masterCookie,409);
 const files=await fetch(base+'/api/files?requestId='+f.requestId,{headers:headers(f.masterCookie)});assert.equal(files.status,200);assert.ok((await files.json()).files.some(v=>v.id===f.fileId));assert.equal((await fetch(base+'/api/files/'+f.fileId,{headers:headers(f.masterCookie)})).status,200);
 const upload=new FormData();upload.set('requestId',f.requestId);upload.set('file',new File(['%PDF-1.4 teste'],'teste.pdf'));assert.equal((await fetch(base+'/api/files',{method:'POST',headers:{Cookie:f.masterCookie,Origin:base},body:upload})).status,409);
 const invoice=afterState.budgetRecords.find(n=>n.kind==='budget_invoice'&&n.data.requestId===f.requestId);await post('/api/data',{action:'budget_invoice',id:invoice.id,version:invoice.version,data:{...invoice.data,requestVersion:archived.version}},f.masterCookie,409);
 const historyResponse=await fetch(base+'/api/data?historyFor='+f.requestId,{headers:headers(f.masterCookie)});assert.equal(historyResponse.status,200);const history=(await historyResponse.json()).activity;assert.ok(history.some(a=>a.action.startsWith('Solicitação criada')));assert.ok(history.some(a=>/arquivada pelo Master/.test(a.action)));assert.ok(history.some(a=>a.entity===invoice.id),'inclui eventos fiscais vinculados');assert.ok(history.some(a=>/Documento anexado/.test(a.action)));
 await act('restore_request',{reason:'Restaurar para validar a etapa original'});const restored=await current();assert.equal(restored.archived,undefined);assert.deepEqual(restored.archiveHistory.map(e=>e.action),['archive','restore']);assert.equal(restored.status,'execution');assert.deepEqual(restored.quotes,before.quotes);
 return {...f,adminCookie,selectedQuote:first};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await prepareRequestArchiveFixture();console.log('PASS HTTP: solicitação inteira, Master-only, restauração, histórico fiscal/anexos preservados e alterações bloqueadas. Nenhuma mensagem real.');}
