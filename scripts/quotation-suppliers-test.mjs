import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {executeJob} from '../integrations/openclaw/client.mjs';

await build({stdin:{contents:"export * from './app/supplier-discovery';export * from './app/model';export * from './lib/integrations';",resolveDir:process.cwd()},outfile:'outputs/quotation-suppliers-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/quotation-suppliers-test.mjs');
assert.equal(typeof api.compatibleQuotationSuppliers,'function','a seleção deve listar fornecedores compatíveis com os itens');
const ids=[1,2,3,4].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
const suppliers=[
 {id:ids[0],version:1,name:'Loja A TESTE',contact:'Contato A',phone:'5592999990001',category:' Materiais de construção ; Papelaria',scope:'local'},
 {id:ids[1],version:1,name:'Loja B TESTE',contact:'Contato B',phone:'5592999990002',category:'Homecenter',scope:'local'},
 {id:ids[2],version:1,name:'Loja Nacional TESTE',contact:'Contato C',phone:'5511999990003',category:'Materiais de construção',scope:'national'},
 {id:ids[3],version:1,name:'Loja incompatível TESTE',contact:'',phone:'5592999990004',category:'Alimentos',scope:'local'},
];
const now='2026-11-13T12:00:00.000Z';
const request={id:'request-test',version:1,code:'CE-TESTE',status:'quoting',items:[{name:'Registro TESTE',category:'Manutenção',quantity:4,unit:'un.',spec:'Especificação fictícia'},{name:'Papel TESTE',category:'Papelaria',quantity:1,unit:'resma',spec:'A4'}],quotes:[],generalApproval:{actor:'DG TESTE',at:now,reason:'Necessidade aprovada'}};
const matches=api.compatibleQuotationSuppliers(request,suppliers);
assert.deepEqual(matches.map(m=>m.supplier.id),ids.slice(0,2),'todos os locais compatíveis, uma única vez por cadastro');
assert.deepEqual(matches[0].itemIndexes,[0,1],'fornecedor de várias categorias mantém os itens compatíveis');
assert.equal(api.compatibleQuotationSuppliers({...request,status:'national'},suppliers).length,3,'etapa nacional admite locais e nacionais, como a fila existente');
assert.deepEqual(api.compatibleQuotationSuppliers({...request,generalApproval:undefined},suppliers),[]);
assert.deepEqual(api.compatibleQuotationSuppliers({...request,archived:{reason:'Teste'}},suppliers),[]);
assert.deepEqual(api.compatibleQuotationSuppliers({...request,items:[{...request.items[0],category:undefined}]},suppliers),[],'não adivinhar categorias legadas');
const template=api.quotationMessageTemplate(request);
assert.ok(template.includes('{{contato}}'));
assert.ok(template.includes('Registro TESTE — 4 un.'));
assert.ok(!template.includes('Contato A'));
assert.equal(api.quotationMessage(request,suppliers[0]),template.replace('{{contato}}','Contato A'),'modelo preserva o conteúdo original da cotação');
assert.ok(api.quotationMessage({...request,items:[{...request.items[0],spec:'Texto literal {{contato}} do item'}]},suppliers[0]).includes('Texto literal {{contato}} do item'),'personalização não substitui marcadores que façam parte da especificação original');

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT,version INTEGER)').run();
 await db.prepare('CREATE TABLE audit(id TEXT PRIMARY KEY,entity TEXT,actor TEXT,action TEXT,at TEXT)').run();
 await assert.rejects(api.enqueueQuotations(db,request,suppliers,[ids[0],ids[3]],'ADM TESTE',now,{}),/compatível/);
 assert.equal((await api.rows(db,'integration_job')).length,0,'validar todos os selecionados antes de preparar tarefas');
 await api.enqueueQuotations(db,request,suppliers,ids.slice(0,2),'ADM TESTE',now,{});
 await api.enqueueQuotations(db,request,suppliers,ids.slice(0,2),'ADM TESTE',now,{});
 const jobs=await api.rows(db,'integration_job');
 assert.equal(jobs.length,2,'repetir a preparação não duplica contatos');
 assert.ok(jobs.every(j=>j.state==='blocked'),'chaves de envio continuam desligadas');
 assert.ok(jobs.every(j=>j.quotationTemplate.text===template),'uma base genérica por solicitação');
 const sent=[];
 for(const job of jobs){
  const result=await executeJob({canSend:true,gateway:'http://127.0.0.1:18789',gatewayToken:'FAKE-ONLY'},job,async(_url,options)=>{
   const body=JSON.parse(options.body);sent.push(body);
   return Response.json({ok:true,result:{details:{messageId:'FAKE-ONLY'}}});
  });
  assert.equal(result.outcome,'success');
 }
 assert.equal(sent.length,2);
 assert.ok(sent[0].args.message.includes('Olá, Contato A!'));
 assert.ok(sent[1].args.message.includes('Olá, Contato B!'));
 assert.ok(sent.every(call=>call.agentId==='operacional'&&!call.args.message.includes('{{contato}}')));
 assert.equal(sent[0].args.target,jobs[0].target);
 assert.equal(sent[0].idempotencyKey,jobs[0].id);
 await assert.rejects(executeJob({canSend:false},jobs[0],()=>assert.fail('não chamar transporte com envio bloqueado')),/Envio bloqueado/);
 const legacy={...jobs[0],quotationTemplate:undefined,message:'Mensagem legada já preparada'};
 await executeJob({canSend:true,gateway:'http://127.0.0.1:18789',gatewayToken:'FAKE-ONLY'},legacy,async(_url,options)=>{
  assert.equal(JSON.parse(options.body).args.message,legacy.message,'fila legada conserva a mensagem original');
  return Response.json({ok:true,result:{details:{messageId:'FAKE-LEGACY'}}});
 });
 console.log('PASS: compatibilidade, seleção múltipla, validação integral, modelo genérico, personalização por contato e idempotência; transporte inteiramente simulado.');
}finally{await mf.dispose()}
