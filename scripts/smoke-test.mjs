import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
assert.equal((await fetch(base+'/api/data')).status,401,'Anonymous requests must be denied');
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
assert.ok(cookie,'Local development login cookie');
const headers={cookie,'Content-Type':'application/json',origin:base};
async function state(){const r=await fetch(base+'/api/data',{headers});assert.equal(r.status,200);return r.json()}
async function post(body,status=200){const r=await fetch(base+'/api/data',{method:'POST',headers,body:JSON.stringify(body)});const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return result}
const req={title:'TESTE LOCAL — Fluxo completo',department:'Administrativo',priority:'Normal',neededBy:'2099-11-20',reason:'Validação automática local, sem compra real.',items:[{name:'Papel A4',quantity:10,unit:'resmas',spec:'75g'}]};
await post({action:'request',data:{...req,items:[{...req.items[0],quantity:-1}]}},400);
const {id}=await post({action:'request',data:req});
const current=async()=>(await state()).requests.find(r=>r.id===id);
async function action(name,fields={},status=200){const r=await current();return post({action:name,id,version:r.version,...fields},status)}
await action('received',{reason:'Recebimento prematuro'},400);
await action('approve');
await post({action:'approve',id,version:1},409);
let q;
for(let n=0;n<3;n++){
  const supplier=await post({action:'supplier',data:{name:`TESTE LOCAL Fornecedor ${n+1}`,category:'Teste',contact:'Contato fictício',phone:'5592999990000'}});
  await action('quote',{data:{supplierId:supplier.id,prices:[20+n],freight:10,deliveryDays:3+n,conditions:'Teste à vista',validUntil:'2099-12-31'}});
  q=(await current()).quotes[0];assert.equal(q.total,210,'Total includes quantity and freight');
  if(n===0)await action('select',{quoteId:q.id,reason:'Menor preço de teste'},400);
}
await action('select',{quoteId:q.id,reason:'Menor preço e especificação atendida no teste'});
await action('quote',{data:{}},400);
await action('ordered',{reason:'Pedido de teste número 001'});
await action('received',{reason:'Conferência fictícia do teste local'});
const result=await state();assert.equal(result.requests.find(r=>r.id===id).status,'received');
assert.equal(result.activity.filter(a=>a.entity===id).length,8,'Every successful request transition has one audit event');
console.log('PASS: authentication, input validation, stage guards, concurrency, quote minimum, totals, purchasing, receiving, audit.');
