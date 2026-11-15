import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
await build({stdin:{contents:"export * from './lib/integrations';export {importSuppliers} from './lib/supplier-import';",resolveDir:process.cwd()},outfile:'outputs/contact-lifecycle-regression-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/contact-lifecycle-regression-test.mjs');
const now='2026-11-15T14:00:00.000Z';
async function fixture(run){
 const mf=new Miniflare({modules:true,script:'export default{fetch(){return new Response("fixture only")}}',d1Databases:['DB']});
 try{
  const db=await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT,version INTEGER)').run();
  await db.prepare('CREATE TABLE audit(id TEXT PRIMARY KEY,entity TEXT,actor TEXT,action TEXT,at TEXT)').run();
  await db.prepare('CREATE TABLE school(id INTEGER PRIMARY KEY,data TEXT)').run();
  await db.prepare('INSERT INTO school VALUES(1,?)').bind(JSON.stringify({minQuotes:3,holidays:[]})).run();
  const put=(id,kind,data)=>db.prepare('INSERT INTO records VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
  await run(db,put);
 }finally{await mf.dispose()}
}
const removed={at:now,by:'TESTE LOCAL',reason:'Contato fictício retirado'};
const base={name:'Fornecedor TESTE LOCAL',category:'Papelaria',scope:'local',contact:''};
for(const kind of ['agenda_contact','supplier'])for(const stored of ['92999990033','005592999990033','+55 (92) 99999-0033']){
 test(`legacy supplier import respects ${kind} tombstone ${stored}`,()=>fixture(async(db,put)=>{
  const id=crypto.randomUUID();await put(id,kind,{...base,phone:stored,classification:'general',removed});
  const before=await api.row(db,id,kind);
  const result=await api.importSuppliers(db,{source:'fixture.csv',contacts:[{...base,phone:'+5592999990033',city:'Manaus',state:'AM'}]},now);
  assert.equal(result.created,0,'cannot recreate a normalized phone held in the trash');
  assert.equal(result.results[0].id,id,'conflict must identify the existing tombstone');
  assert.deepEqual(await api.row(db,id,kind),before,'no promotion, overwrite or restore');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM records').first()).n,1);
 }));
}
for(const kind of ['agenda_contact','supplier'])test(`discovery cannot recreate ${kind} tombstone`,()=>fixture(async(db,put)=>{
 const id=crypto.randomUUID(),requestId=crypto.randomUUID(),jobId='supplier-search:fixture';
 await put(id,kind,{...base,phone:'92999990044',classification:'general',removed});
 await put(requestId,'request',{code:'CE-FAKE',status:'quoting',generalApproval:{at:now},items:[{name:'Papel TESTE',category:'Papelaria',quantity:1,unit:'un',spec:''}],quotes:[]});
 await put(jobId,'integration_job',{requestId,type:'local_supplier_search',state:'review',category:'Papelaria',researchedAt:now,sources:[{url:'https://example.com/fake',title:'TESTE'}]});
 const before=await api.row(db,id,kind);
 await assert.rejects(api.registerDiscoveredSupplier(db,jobId,0,{name:'Outro TESTE',phone:'+5592999990044',contact:''},'ADM TESTE',now));
 assert.deepEqual(await api.row(db,id,kind),before);
 assert.equal((await api.rows(db,'supplier')).length,kind==='supplier'?1:0);
}));
test('tick projects confirmed historical delivery without restoring a removed supplier',()=>fixture(async(db,put)=>{
 const supplierId=crypto.randomUUID(),requestId=crypto.randomUUID(),jobId='whatsapp:historical-fake';
 await put(supplierId,'supplier',{...base,phone:'+5592999990011',removed});
 await put(requestId,'request',{code:'CE-FAKE',status:'quoting',generalApproval:{at:now},items:[{name:'Papel TESTE',category:'Papelaria',quantity:1,unit:'un',spec:''}],quotes:[]});
 await put(jobId,'integration_job',{requestId,type:'whatsapp_quote',state:'done',attempts:1,supplierId,supplierName:'Nome histórico TESTE',target:'+5592999990011',sentAt:now,providerMessageId:'FAKE-RECEIPT',createdAt:now,updatedAt:now});
 const supplierBefore=await api.row(db,supplierId,'supplier'),jobBefore=await api.row(db,jobId,'integration_job');
 await api.tick(db,{WHATSAPP_SEND_ENABLED:'false'},now);
 await api.tick(db,{WHATSAPP_SEND_ENABLED:'false'},now);
 const request=await api.row(db,requestId,'request');
 assert.equal(request.localAttempts.length,1,'historical receipt is projected once');
 assert.equal(request.localAttempts[0].integrationJobId,jobId);assert.equal(request.localAttempts[0].at,now);
 assert.equal(request.localAttempts[0].supplierName,'Nome histórico TESTE');assert.ok(request.localDeadline);
 assert.deepEqual(await api.row(db,supplierId,'supplier'),supplierBefore,'supplier remains removed and version unchanged');
 assert.deepEqual(await api.row(db,jobId,'integration_job'),jobBefore,'receipt remains unchanged');
 assert.ok(await api.row(db,'integration:heartbeat','integration_state'),'polling continues after projection');
}));
