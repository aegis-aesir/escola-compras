import assert from 'node:assert/strict';
import {localBase,localTestSession,testUsers} from './local-test-session.mjs';
import {simplifiedBudgetFixture} from './budget-fixture.mjs';

assert.equal(localBase,'http://127.0.0.1:5185');
const master=await localTestSession(),general=await localTestSession(testUsers[2]);
async function call(body,cookie=master,expected=200){
 const response=await fetch(localBase+'/api/data',{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:localBase,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json();assert.equal(response.status,expected,JSON.stringify(result));return result;
}
assert.equal((await call()).integrations.sendingEnabled,false,'teste somente com envio local desativado');
const key=crypto.randomUUID(),phoneBase=String(Date.now()).slice(-8);
const createSupplier=async(name,category,n)=>(await call({action:'supplier',data:{name:name+' TESTE LOCAL '+key,category,scope:'local',phone:'5592'+phoneBase+n,contact:'Contato TESTE'}})).id;
const service=await createSupplier('Prestador de manutenção','Manutenção',1);
const material=await createSupplier('Loja de materiais','Materiais de construção',2);
const homecenter=await createSupplier('Homecenter','Homecenter',3);
const utilities=await createSupplier('Loja de utilidades','Utilidades',4);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
const current=async id=>(await call()).requests.find(request=>request.id===id);
const act=async(id,action,extra={},expected=200,cookie=master)=>call({action,id,version:(await current(id)).version,...extra},cookie,expected);
async function approved(name){
 const fixture={...simplifiedBudgetFixture(),department:'Administrativo',title:'TESTE LOCAL materiais versus serviços '+key};
 fixture.items=[{...fixture.items[0],name,category:'Manutenção',quantity:4,unit:'un.',spec:'Detalhamento fictício para teste local'}];
 const {id}=await call({action:'request',data:fixture});
 await act(id,'estimate',{data:{references:[{unitPrice:10,sourceName:'Fonte TESTE LOCAL',sourceUrl:'https://example.com/teste',researchedOn:today}],freight:0,notes:'Referência fictícia, sem pesquisa externa.'}});
 await act(id,'budget_management',{submitToGeneral:true,data:{quantityAssessment:'Adequadas',additionalDataStatus:'Não necessárias',recommendation:'Aprovar integralmente',validatedPriority:'Essencial'}});
 await act(id,'decide_need',{choice:'approve',reason:'Aprovação fictícia para teste local'},200,general);
 return id;
}
const materialId=await approved('Registro para mictório TESTE');
await act(materialId,'prepare_openclaw',{supplierIds:[service]},409);
await act(materialId,'prepare_openclaw',{supplierId:service},400);
await act(materialId,'prepare_openclaw',{supplierIds:[material,homecenter,utilities]});
let state=await call();const materialJobs=state.integrations.jobs.filter(job=>job.requestId===materialId&&job.type==='whatsapp_quote');
assert.equal(materialJobs.length,3);assert.ok(materialJobs.every(job=>job.state==='blocked'));
assert.equal((await current(materialId)).items[0].category,'Manutenção','segmento de busca não reescreve o pedido');
const serviceId=await approved('Serviço de instalação de registro para mictório TESTE');
await act(serviceId,'prepare_openclaw',{supplierIds:[material]},409);
await act(serviceId,'prepare_openclaw',{supplierIds:[service]});
state=await call();const serviceJobs=state.integrations.jobs.filter(job=>job.requestId===serviceId&&job.type==='whatsapp_quote');assert.equal(serviceJobs.length,1);assert.equal(serviceJobs[0].supplierId,service);
for(const id of [materialId,serviceId])await act(id,'archive_request',{reason:'Preservar solicitação fictícia após teste local de segmentos'});
console.log('PASS HTTP 5185: lojas para registro/material, prestador para instalação, contratos singular/múltiplo protegidos, categoria original preservada e fila bloqueada. Sem envios reais.');
