import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
await build({entryPoints:['lib/integrations.ts'],outfile:'outputs/cancel-quotation-jobs-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/cancel-quotation-jobs-test.mjs');
assert.equal(typeof api.cancelQuotationJobs,'function','manual audited cancellation must exist');
const mf=new Miniflare({modules:true,script:'export default{fetch(){return new Response("fake")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB'),now=new Date().toISOString(),requestId=crypto.randomUUID();
 await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT,version INTEGER)').run();await db.prepare('CREATE TABLE audit(id TEXT PRIMARY KEY,entity TEXT,actor TEXT,action TEXT,at TEXT)').run();
 const put=async(id,kind,data)=>db.prepare('INSERT INTO records VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 await put(requestId,'request',{status:'quoting',form:{fields:{referenceMonth:'2026-11'}}});
 const job={requestId,type:'whatsapp_quote',state:'blocked',attempts:0,message:'Mensagem fictícia preservada',createdAt:now,updatedAt:now,nextAttemptAt:now};
 for(let i=0;i<9;i++)await put('whatsapp:'+String(i).repeat(64),'integration_job',job);
 const before=await api.rows(db,'integration_job'),chosen=before.slice(0,8).map(({id,version})=>({id,version})),untouched=before[8],actor={role:'admin',name:'TESTE LOCAL'};
 const run=(jobs=chosen,who=actor,reason='Cancelamento autorizado no teste local')=>api.cancelQuotationJobs(db,jobs,reason,who,now);
 for(const role of ['solicitante','geral','financeiro'])await assert.rejects(run(chosen,{...actor,role}),e=>e.status===403);
 await assert.rejects(run(chosen,actor,''));await assert.rejects(run([...chosen,chosen[0]]));
 await assert.rejects(run(chosen.map((j,i)=>i?j:{...j,version:2})),e=>e.status===409);
 for(const patch of [{state:'running'},{state:'uncertain'},{state:'done'},{attempts:1},{leaseToken:'lease'},{leaseUntil:now},{sentAt:now},{providerMessageId:'receipt'},{testSend:{version:1}}]){
  await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({...job,...patch}),chosen[0].id).run();await assert.rejects(run(),e=>e.status===409);
 }
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify(job),chosen[0].id).run();
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({archived:{at:now},form:{fields:{referenceMonth:'2026-11'}}}),requestId).run();await assert.rejects(run(),e=>e.status===409);
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({form:{fields:{referenceMonth:'2026-11'}}}),requestId).run();
 await put('closing','budget_closing',{month:'2026-11',status:'Concluído'});await assert.rejects(run(),e=>e.status===409);await db.prepare("UPDATE records SET data='{}' WHERE id='closing'").run();
 assert.deepEqual(await api.rows(db,'integration_job'),before,'invalid batch changes no task');
 assert.equal((await db.prepare('SELECT * FROM audit').all()).results.length,0);
 for(const race of [
  ()=>db.prepare('UPDATE records SET version=version+1 WHERE id=?').bind(requestId).run(),
  ()=>db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({month:'2026-11',status:'Concluído'}),'closing').run()
 ]){
  const racingDb={prepare:db.prepare.bind(db),batch:async statements=>{await race();return db.batch(statements)}};
  await assert.rejects(api.cancelQuotationJobs(racingDb,chosen,'TESTE LOCAL conflito durante gravação',actor,now),e=>e.status===409);
  assert.deepEqual(await api.rows(db,'integration_job'),before,'concurrent closing/request change cancels nothing');
  assert.equal((await db.prepare('SELECT * FROM audit').all()).results.length,0);
  await db.prepare("UPDATE records SET data='{}' WHERE id='closing'").run();
 }
 await run();const after=await api.rows(db,'integration_job');assert.deepEqual(after.find(j=>j.id===untouched.id),untouched);
 for(const j of before.slice(0,8)){const actual=after.find(a=>a.id===j.id);assert.equal(actual.state,'cancelled');assert.equal(actual.version,2);assert.equal(actual.message,j.message);assert.equal(actual.cancellation.previousState,'blocked');assert.equal(actual.cancellation.actor,actor.name);assert.equal(actual.attempts,0);}
 assert.equal((await db.prepare('SELECT * FROM audit').all()).results.length,8);await assert.rejects(run(),e=>e.status===409);
 assert.equal(await api.claimJob(db,{WHATSAPP_SEND_ENABLED:'false'},now,false),null);
 console.log('PASS: explicit versioned eight-task cancellation, permissions, reason, unsafe states/receipts/leases, closed month/archive, audit and ninth task preserved.');
}finally{await mf.dispose();}
