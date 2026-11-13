import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';

await build({stdin:{contents:"export * from './app/supplier-discovery';export * from './lib/integrations';",resolveDir:process.cwd()},outfile:'outputs/maintenance-suppliers-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/maintenance-suppliers-test.mjs');
const now='2026-11-13T12:00:00Z';
const request={id:'material-request',version:1,status:'quoting',code:'CE-MATERIAL',items:[{name:'Registro para mictório',category:'Manutenção',spec:'Peça de reposição hidráulica',quantity:4,unit:'un.'}],quotes:[],generalApproval:{actor:'DG TESTE',at:now,reason:'Necessidade aprovada'}};
const suppliers=[
 {id:'service',version:1,name:'Empresa de Manutenção Predial TESTE',category:'Manutenção',scope:'local',phone:'5592999990001'},
 {id:'construction',version:1,name:'Loja de materiais de construção TESTE',category:'Materiais de construção',scope:'local',phone:'5592999990002'},
 {id:'homecenter',version:1,name:'Homecenter TESTE',category:'Home Center',scope:'local',phone:'5592999990003'},
 {id:'utilities',version:1,name:'Loja de utilidades TESTE',category:'Utilidades',scope:'local',phone:'5592999990004'},
 {id:'plumbing',version:1,name:'Comércio hidráulico TESTE',category:'Materiais hidráulicos',scope:'local',phone:'5592999990005'},
 {id:'misclassified-store',version:1,name:'Materiais de Construção TESTE',category:'Manutenção',scope:'local',phone:'5592999990006'},
 {id:'food',version:1,name:'Alimentos TESTE',category:'Alimentos',scope:'local',phone:'5592999990007'},
 {id:'national',version:1,name:'Materiais nacionais TESTE',category:'Materiais de construção',scope:'national',phone:'5511999990008'},
];
const before=structuredClone(request);
const misleadingService={...suppliers[0],id:'misleading-service',name:'Homecenter Serviços TESTE',category:'Serviços de manutenção'};
const unrelatedRetailName={...suppliers[0],id:'unrelated-food',name:'Utilidades TESTE',category:'Alimentos'};
assert.deepEqual(api.compatibleQuotationSuppliers(request,[misleadingService,unrelatedRetailName]),[],'o nome não deve sobrepor categorias explícitas de serviço ou de outro segmento');
assert.equal(api.supplierCategoryForItem({...request.items[0],name:'Necessidade a detalhar',category:'Hidráulica'}),undefined,'Hidráulica sem intenção identificável exige conferência');
assert.deepEqual(api.compatibleQuotationSuppliers(request,suppliers).map(m=>m.supplier.id).sort(),['construction','homecenter','utilities','plumbing','misclassified-store'].sort(),'material de manutenção deve trazer lojas e excluir prestadores de serviço');
assert.deepEqual(request,before,'não reclassificar nem modificar os itens originais');
const serviceRequest={...request,id:'service-request',items:[{...request.items[0],name:'Serviço de instalação de registro para mictório'}]};
assert.deepEqual(api.compatibleQuotationSuppliers(serviceRequest,suppliers).map(m=>m.supplier.id),['service'],'o serviço deve continuar direcionado a prestadores');
const mixedSupplier={...suppliers[0],id:'both',name:'Serviços e materiais TESTE',category:'Manutenção; Materiais hidráulicos'};
assert.equal(api.compatibleQuotationSuppliers(request,[mixedSupplier]).length,1,'categoria explícita de materiais permite fornecedor que também presta serviço');
assert.equal(api.compatibleQuotationSuppliers(serviceRequest,[mixedSupplier]).length,1);
const explicitMixed={...mixedSupplier,name:'ABC Comercial TESTE',category:'Serviços de manutenção; Materiais de construção'};
assert.equal(api.compatibleQuotationSuppliers(serviceRequest,[explicitMixed]).length,1,'categoria explícita de serviço vale também para fornecedor de nome neutro');
assert.equal(api.supplierCategoryForItem({...request.items[0],category:'Serviços de manutenção'}),'Serviços de manutenção','classificação explícita do item prevalece sobre o nome');
assert.equal(api.supplierCategoryForItem({...serviceRequest.items[0],category:'Materiais de construção'}),'Materiais de construção');
const hydraulicService={...serviceRequest,items:[{...serviceRequest.items[0],name:'Serviço de instalação hidráulica',category:'Hidráulica'}]};
assert.equal(api.compatibleQuotationSuppliers(hydraulicService,[{...suppliers[0],name:'Serviços de Hidráulica TESTE',category:'Hidráulica'}]).length,1,'prestador hidráulico continua disponível para serviço hidráulico');
assert.equal(api.compatibleQuotationSuppliers({...request,status:'national'},suppliers).length,6);
const trailingCategories={...suppliers.find(supplier=>supplier.id==='misclassified-store'),id:'trailing-category',category:'Manutenção; , '};
assert.equal(api.compatibleQuotationSuppliers(request,[trailingCategories]).length,1,'separadores vazios não mudam a classificação material de um cadastro válido');
assert.equal(api.compatibleQuotationSuppliers(serviceRequest,[trailingCategories]).length,0,'separador final não transforma loja em prestador');
assert.deepEqual(api.compatibleQuotationSuppliers({...request,items:[{...request.items[0],category:undefined}]},suppliers),[],'categorias legadas ausentes não são inferidas');
assert.deepEqual(api.compatibleQuotationSuppliers({...request,items:[{...request.items[0],name:'Necessidade a detalhar',spec:''}]},suppliers),[],'Manutenção ambígua exige detalhamento');

const mf=new Miniflare({modules:true,script:'export default{fetch(){return new Response("test")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT,version INTEGER)').run();
 await db.prepare('CREATE TABLE audit(id TEXT PRIMARY KEY,entity TEXT,actor TEXT,action TEXT,at TEXT)').run();
 const put=(id,kind,data)=>db.prepare('INSERT INTO records VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 await put(request.id,'request',request);await put(suppliers[0].id,'supplier',suppliers[0]);
 await put(misleadingService.id,'supplier',misleadingService);await put(unrelatedRetailName.id,'supplier',unrelatedRetailName);
 for(const supplier of [misleadingService,unrelatedRetailName])await assert.rejects(api.enqueueQuotation(db,request,supplier,'ADM TESTE',now,{}),/fornecedor permitido/,'preparação singular também respeita a categoria explícita');
 const ambiguousHydraulics={...request,id:'ambiguous-hydraulics',items:[{...request.items[0],name:'Necessidade a detalhar',category:'Hidráulica'}]};
 await put(ambiguousHydraulics.id,'request',ambiguousHydraulics);
 assert.equal(await api.enqueueSupplierSearch(db,ambiguousHydraulics,'ADM TESTE',now),0,'intenção hidráulica ambígua não enfileira pesquisa automática');
 assert.equal(await api.enqueueSupplierSearch(db,request,'ADM TESTE',now),1,'prestador cadastrado não deve impedir busca de lojas');
 let jobs=await api.rows(db,'integration_job');const job=jobs.find(j=>j.requestId===request.id);
 assert.match(job.query,/registro para mictório/i);assert.match(job.query,/materiais de constru[çc][ãa]o/i);assert.match(job.query,/homecenter/i);assert.match(job.query,/utilidades/i);
 await assert.rejects(api.enqueueQuotation(db,request,suppliers[0],'ADM TESTE',now,{}),/fornecedor permitido/,'não preparar mensagem para prestador que não vende o material');
 const legacy={...job,id:'old-maintenance-search',category:'Manutenção',query:'Manutenção fornecedores Manaus',state:'queued'};
 await put(legacy.id,'integration_job',legacy);
 await put('old-wrong-quotation','integration_job',{...legacy,id:'old-wrong-quotation',type:'whatsapp_quote',supplierId:'service',target:'+5592999990001',accountId:'operacional',schoolPhone:'+559292017107',message:'Mensagem legada não deve ser enviada a um prestador para compra de material'});
 await put('new-store','supplier',{...suppliers[1],id:'new-store'});
 assert.equal(await api.claimJob(db,{},now,false),null,'loja compatível passa a suprir a busca externa; pesquisa genérica antiga não deve rodar');
 jobs=await api.rows(db,'integration_job');assert.ok(jobs.every(j=>j.state==='cancelled'));
 const nationalRequest={...request,id:'national-registration',status:'national'};await put(nationalRequest.id,'request',nationalRequest);
 assert.equal(await api.enqueueSupplierSearch(db,nationalRequest,'ADM TESTE',now),1);
 const nationalJob=await api.claimJob(db,{},now,false);assert.equal(nationalJob.requestId,nationalRequest.id);
 await api.completeJob(db,{jobId:nationalJob.id,leaseToken:nationalJob.leaseToken,outcome:'success',sources:[{title:'Loja de hidráulica TESTE',url:'https://example.com/fornecedor-ficticio',description:'Fonte fictícia para validar cadastro conferido'}]},now);
 const registeredId=await api.registerDiscoveredSupplier(db,nationalJob.id,0,{name:'Loja de hidráulica TESTE',phone:'5511999990020',contact:'Contato TESTE'},'ADM TESTE',now);
 const registered=(await api.rows(db,'supplier')).find(supplier=>supplier.id===registeredId);
 assert.equal(registered.category,'Materiais de construção','cadastro conferido usa o segmento material da pesquisa, não o rótulo amplo Manutenção');
 assert.equal(registered.scope,'national');
 assert.deepEqual(JSON.parse((await db.prepare('SELECT data FROM records WHERE id=?').bind(request.id).first()).data),request);
 console.log('PASS: materiais versus serviços, lojas de construção/homecenter/utilidades/hidráulica, busca contextual, fila e pedido original preservado. Sem pesquisa ou envio real.');
}finally{await mf.dispose()}
