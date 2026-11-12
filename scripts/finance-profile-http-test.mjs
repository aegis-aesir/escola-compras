import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localBase as base,localTestSession} from './local-test-session.mjs';
import {budgetFixture} from './budget-fixture.mjs';

export async function prepareFinanceFixture(){
 const masterCookie=await localTestSession(),username='finance.test.'+Date.now();
 const headers=cookie=>({Cookie:cookie,Origin:base,'Content-Type':'application/json'});
 async function post(path,body,cookie=masterCookie,status=200){const r=await fetch(base+path,{method:'POST',headers:headers(cookie),body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return {r,d}}
 async function snapshot(cookie){const r=await fetch(base+'/api/data',{headers:headers(cookie)});assert.equal(r.status,200);return r.json()}
 const {d:credentials}=await post('/api/auth/users',{username,name:'TESTE LOCAL Financeiro',role:'financeiro',department:'Financeiro'});
 const {r:login}=await post('/api/auth/login',{username,password:credentials.temporaryPassword});const financeCookie=login.headers.get('set-cookie').split(';')[0];
 const title='TESTE LOCAL acompanhamento financeiro '+Date.now();
 const {d:{id}}=await post('/api/data',{action:'request',data:{...budgetFixture('monthly'),title,department:'Administrativo'}});
 const unapprovedTitle='TESTE LOCAL financeiro sem aprovação '+Date.now();
 const {d:{id:unapprovedId}}=await post('/api/data',{action:'request',data:{...budgetFixture('monthly'),title:unapprovedTitle,department:'Administrativo'}});
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
 async function act(requestId,action,extra={}){const current=(await snapshot(masterCookie)).requests.find(r=>r.id===requestId);return post('/api/data',{action,id:requestId,version:current.version,...extra})}
 await act(id,'estimate',{data:{references:[{unitPrice:41.15,sourceName:'Fonte TESTE LOCAL',sourceUrl:'https://example.com/financeiro',researchedOn:today}],freight:0,notes:'Estimativa fictícia para validar a autorização financeira.'}});
 await act(id,'budget_management',{data:{quantityAssessment:'Adequadas',additionalDataStatus:'Não necessárias',recommendation:'Aprovar integralmente',validatedPriority:'Essencial'},submitToGeneral:true});
 await act(id,'decide_need',{choice:'approve',itemIndexes:[0],reason:'Necessidade aprovada pela Diretora Geral no teste financeiro'});
 const before=await snapshot(masterCookie);const request=before.requests.find(r=>r.id===id);const unapprovedRequest=before.requests.find(r=>r.id===unapprovedId);
 const file=new FormData();file.set('requestId',id);file.set('visibility','internal');file.set('file',new File(['%PDF-1.4 TESTE LOCAL financeiro'],'TESTE-LOCAL-financeiro.pdf',{type:'application/pdf'}));
 const upload=await fetch(base+'/api/files',{method:'POST',headers:{Cookie:masterCookie,Origin:base},body:file});assert.equal(upload.status,200);const fileId=(await upload.json()).id;
 const unapprovedFile=new FormData();unapprovedFile.set('requestId',unapprovedId);unapprovedFile.set('visibility','internal');unapprovedFile.set('file',new File(['%PDF-1.4 TESTE LOCAL sem aprovacao'],'TESTE-LOCAL-sem-aprovacao.pdf',{type:'application/pdf'}));
 const unapprovedUpload=await fetch(base+'/api/files',{method:'POST',headers:{Cookie:masterCookie,Origin:base},body:unapprovedFile});assert.equal(unapprovedUpload.status,200);const unapprovedFileId=(await unapprovedUpload.json()).id;
 const invoiceNumber='NF-TESTE-FIN-'+Date.now();
 const invoice={requestId:id,requestVersion:request.version,month:request.form.fields.referenceMonth,supplier:'Fornecedor fictício do teste',number:invoiceNumber,issuedOn:today,amount:123.45,dueOn:'2099-12-31',documentType:'NF-e',scenario:'amazonas',received:{status:'Pendente'},correctCnpj:{status:'Pendente'},xml:{status:'Pendente'},accountingStatus:'Pendente',accountingReference:'Referência fictícia',accountingResponsible:'Contabilidade fictícia',sentToAccountingOn:'',taxGuide:'',taxDueOn:'',released:false,paymentStatus:'Programado',paidOn:'',notes:'Observação financeira exclusivamente de teste',documents:[fileId]};
 const {d:{id:invoiceId}}=await post('/api/data',{action:'budget_invoice',data:invoice});
 const unapprovedInvoice={...invoice,requestId:unapprovedId,requestVersion:unapprovedRequest.version,number:'NF-TESTE-FIN-SEM-APROVACAO-'+Date.now(),documents:[unapprovedFileId]};
 const {d:{id:unapprovedInvoiceId}}=await post('/api/data',{action:'budget_invoice',data:unapprovedInvoice});
 const view=await snapshot(financeCookie);assert.equal(view.me.role,'financeiro');assert.ok(view.requests.some(r=>r.id===id));assert.ok(!view.requests.some(r=>r.id===unapprovedId));assert.ok(view.budgetRecords.some(r=>r.id===invoiceId));assert.ok(!view.budgetRecords.some(r=>r.id===unapprovedInvoiceId),'financeiro não recebe nota vinculada a solicitação sem aprovação da Diretora Geral');assert.deepEqual(view.members,[]);assert.deepEqual(view.suppliers,[]);assert.equal(view.integrations,undefined);assert.ok(view.activity.every(a=>view.requests.some(r=>r.id===a.entity)||view.budgetRecords.some(r=>r.id===a.entity)));
 const listed=await fetch(base+'/api/files?requestId='+id,{headers:{Cookie:financeCookie}});assert.equal(listed.status,200);assert.ok((await listed.json()).files.some(f=>f.id===fileId));assert.equal((await fetch(base+'/api/files/'+fileId,{headers:{Cookie:financeCookie}})).status,200);
 assert.equal((await fetch(base+'/api/files?requestId='+unapprovedId,{headers:{Cookie:financeCookie}})).status,404);
 assert.equal((await fetch(base+'/api/files/'+unapprovedFileId,{headers:{Cookie:financeCookie}})).status,404);
 assert.equal((await fetch(base+'/api/data?historyFor='+unapprovedId,{headers:{Cookie:financeCookie}})).status,403);
 for(const action of ['request','supplier','settings','resubmit_request','research','prepare_openclaw','retry_integration','review_message','supplier_categories','register_discovered_supplier','estimate','admin_review','decide_need','reject','quote','select','ordered','received','budget_management','reopen_request','budget_invoice','budget_closing','budget_reopen'])await post('/api/data',{action,id,version:request.version,reason:'Tentativa fictícia de edição',data:invoice},financeCookie,403);
 assert.equal((await fetch(base+'/api/files',{method:'POST',headers:{Cookie:financeCookie,Origin:base},body:new FormData()})).status,403);
 await post('/api/auth/users',{username:'nao.criar',name:'Não criar',role:'admin',department:'Financeiro'},financeCookie,403);
 const after=await snapshot(masterCookie);assert.deepEqual(after.requests.find(r=>r.id===id),request);assert.deepEqual(after.budgetRecords.find(r=>r.id===invoiceId).data,view.budgetRecords.find(r=>r.id===invoiceId).data);
 return {financeCookie,masterCookie,requestId:id,title,invoiceNumber,fileId,month:invoice.month,unapprovedId,unapprovedInvoiceId,unapprovedFileId};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await prepareFinanceFixture();console.log('PASS HTTP: Financeiro reads only DG-approved requests and their invoices, payments and private files; all mutations denied. No real messages.');}
