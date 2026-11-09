import assert from 'node:assert/strict';
import {localTestSession} from './local-test-session.mjs';
const base='http://127.0.0.1:5173';
assert.equal((await fetch(base+'/api/data')).status,401,'Anonymous requests must be denied');
const cookie=await localTestSession();
assert.ok(cookie,'Local development session cookie');
const headers={cookie,'Content-Type':'application/json',origin:base};
async function state(){const r=await fetch(base+'/api/data',{headers});assert.equal(r.status,200);return r.json()}
async function post(body,status=200){const r=await fetch(base+'/api/data',{method:'POST',headers,body:JSON.stringify(body)});const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result}
const req={title:'TESTE LOCAL — Fluxo completo',department:'Administrativo',priority:'Normal',neededBy:'2099-11-20',reason:'Validação automática local, sem compra real.',items:[{name:'Papel A4',quantity:10,unit:'resmas',spec:'75g'}]};
await post({action:'request',data:{...req,items:[{...req.items[0],quantity:-1}]}},400);
const {id}=await post({action:'request',data:req});
const current=async()=>(await state()).requests.find(r=>r.id===id);
async function action(name,fields={},status=200){const r=await current();return post({action:name,id,version:r.version,...fields},status)}
await action('received',{reason:'Recebimento prematuro'},400);
await action('approve',{reason:'Tentativa sem análise'},400);
await action('estimate',{data:{references:[{unitPrice:10,sourceName:'Fonte fictícia de teste',sourceUrl:'https://example.com/papel',researchedOn:'2026-01-01'}],freight:0,notes:'Teste de referência, sem pesquisa real.'}});
assert.equal((await current()).status,'admin_review');
await action('admin_review',{reason:'Necessidade conferida pela administração'});
await action('approve',{reason:'Necessidade aprovada, sem aprovação de valor'});
await post({action:'approve',id,version:1,reason:'Versão antiga'},409);
let q;
for(let n=0;n<3;n++){
  const supplier=await post({action:'supplier',data:{name:`TESTE LOCAL Fornecedor ${n+1}`,category:'Teste',contact:'Contato fictício',phone:'5592999990000'}});
  if(n===0){await action('local_contact',{supplierId:supplier.id,reason:'Contato fictício já realizado no teste'});await action('national',{reason:'Ainda não passou um dia útil'},400);}
  await action('quote',{data:{supplierId:supplier.id,prices:[20+n],freight:10,deliveryDays:3+n,conditions:'Teste à vista',validUntil:'2099-12-31'}});
  q=(await current()).quotes[0];assert.equal(q.total,210,'Total includes quantity and freight');
  if(n===0)await action('select',{quoteId:q.id,reason:'Menor preço de teste'},400);
}
await action('select',{quoteId:q.id,reason:'Menor preço e especificação atendida no teste'});
assert.equal((await current()).status,'execution');
assert.ok(q.total>(await current()).estimate.total,'Actual price above estimate must not require another general approval');
await action('quote',{data:{}},400);
await action('execution_note',{reason:'Confirmando prazo com o fornecedor de teste'});
await action('ordered',{reason:'Pedido de teste número 001'});
await action('received',{reason:'Conferência fictícia do teste local'});
const result=await state();assert.equal(result.requests.find(r=>r.id===id).status,'received');
assert.equal(result.activity.filter(a=>a.entity===id).length,12,'Every successful request transition has one audit event');
console.log('PASS: login, estimates, administrative review, general approval of need, local contact, deadline gate, actual quote above estimate, execution, audit.');
