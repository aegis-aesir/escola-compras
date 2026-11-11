import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
import {prepareFinanceFixture} from './finance-profile-http-test.mjs';import {localBase as base} from './local-test-session.mjs';
export async function prepareArchiveFixture(){
 const f=await prepareFinanceFixture(),headers=cookie=>({Cookie:cookie,Origin:base,'Content-Type':'application/json'});
 async function state(){const r=await fetch(base+'/api/data',{headers:headers(f.masterCookie)});assert.equal(r.status,200);return r.json()}
 async function post(path,body,cookie=f.masterCookie,status=200){const r=await fetch(base+path,{method:'POST',headers:headers(cookie),body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return {r,d}}
 const current=async()=>(await state()).requests.find(r=>r.id===f.requestId);
 const act=async(action,extra={},cookie=f.masterCookie,status=200)=>post('/api/data',{action,id:f.requestId,version:(await current()).version,...extra},cookie,status);
 await build({entryPoints:['app/budget-fields.ts'],outfile:'outputs/quote-archive-http-fields.mjs',bundle:true,platform:'node',format:'esm'});const {managementSections}=await import('../outputs/quote-archive-http-fields.mjs');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
 await act('estimate',{data:{references:[{unitPrice:10,sourceName:'Fonte fictícia',sourceUrl:'https://example.com/teste',researchedOn:today}],freight:0,notes:'Pesquisa fictícia sem contato externo.'}});
 const review={...Object.fromEntries(managementSections('monthly').flatMap(s=>s.fields).filter(f=>f.key.startsWith('review')&&f.type==='select').map(f=>[f.key,'Sim'])),recommendation:'Aprovar integralmente',validatedPriority:'Essencial',recommendedScope:'Escopo fictício',analysis:'Necessidade conferida no teste',opinionReason:'Justificativa fictícia'};
 await act('budget_management',{data:review});await act('admin_review',{reason:'Parecer fictício para teste'});await act('decide_need',{choice:'approve',reason:'Necessidade fictícia aprovada, sem teto de valor'});
 for(let i=0;i<3;i++){const {d:{id:supplierId}}=await post('/api/data',{action:'supplier',data:{name:'TESTE LOCAL arquivo fornecedor '+i+' '+Date.now(),category:'Papelaria',phone:'5592999990000',contact:'Contato fictício',scope:'local'}});await act('quote',{data:{supplierId,prices:[10+i],coverage:[3],comparable:true,currency:'BRL',priceBasis:'term',freight:0,otherExpenses:0,deliveryDays:2,conditions:'Proposta fictícia sem envio real',validUntil:'2099-12-31'}});}
 const initial=await current(),first=initial.quotes[0],second=initial.quotes[1];
 const username='admin.archive.'+Date.now();const {d:credential}=await post('/api/auth/users',{username,name:'TESTE LOCAL Administrativo',role:'administrativo',department:'Administrativo'});const {r:login}=await post('/api/auth/login',{username,password:credential.temporaryPassword});const adminCookie=login.headers.get('set-cookie').split(';')[0];
 await act('archive_quote',{quoteId:first.id,reason:'Tentativa sem acesso Master'},adminCookie,403);await act('archive_quote',{quoteId:first.id,reason:'Tentativa sem acesso Master'},f.financeCookie,403);
 await act('archive_quote',{quoteId:first.id,reason:'Fornecedor enviou proposta substituta'});
 await post('/api/data',{action:'archive_quote',id:f.requestId,version:initial.version,quoteId:first.id,reason:'Versão antiga não deve duplicar ação'},f.masterCookie,409);
 let r=await current();assert.equal(r.quotes.length,3);assert.ok(r.quotes[0].archived);assert.equal(r.status,'quoting');
 await act('select',{quoteId:second.id,reason:'Tentativa sem número mínimo de propostas ativas'},f.masterCookie,400);
 await act('restore_quote',{quoteId:first.id,reason:'Proposta conferida e restaurada'});r=await current();assert.equal(r.quotes[0].archived,undefined);assert.equal(r.quotes[0].archiveHistory.length,2);
 await act('select',{quoteId:first.id,reason:'Menor proposta válida para execução'});await act('archive_quote',{quoteId:first.id,reason:'Tentativa de arquivar proposta escolhida'},f.masterCookie,400);
 assert.equal((await state()).activity.filter(a=>a.entity===f.requestId&&/Cotação (arquivada|restaurada) pelo Master/.test(a.action)).length,2);
 return {...f,otherQuote:second,selectedQuote:first,adminCookie};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await prepareArchiveFixture();console.log('PASS HTTP: Master-only archive/restore, version/audit history, preserved proposals, active minimum and selected quote protection. Financeiro remains read-only. No messages.');}
