import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {existsSync} from 'node:fs';
const extra=existsSync('lib/quotation-removal.ts')?"export * from './lib/quotation-removal';":'';
await build({stdin:{contents:"export * from './lib/integrations';export * from './lib/quotation-contacts';"+extra,resolveDir:process.cwd()},outfile:'outputs/quotation-removal-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/quotation-removal-test.mjs');
assert.equal(typeof api.removeQuotationJob,'function','recoverable quotation removal must exist');
const mf=new Miniflare({modules:true,script:'export default{fetch(){return new Response("fake")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB'),now=new Date().toISOString(),rId=crypto.randomUUID(),cId=crypto.randomUUID(),jobId='whatsapp:'+'c'.repeat(64),actor={name:'ADM TESTE',role:'administrativo'};
 await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT,version INTEGER)').run();await db.prepare('CREATE TABLE audit(id TEXT PRIMARY KEY,entity TEXT,actor TEXT,action TEXT,at TEXT)').run();
 const put=async(id,kind,data)=>db.prepare('INSERT INTO records VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 const r={id:rId,version:1,code:'CE-FAKE',status:'quoting',generalApproval:{at:now},items:[{name:'Registro TESTE',unit:'un.',quantity:4,category:'Manutenção'}],form:{fields:{referenceMonth:'2026-11'}},quotes:[]};await put(rId,'request',r);await put(cId,'agenda_contact',{name:'Contato TESTE',phone:'+5592999990033',classification:'general'});
 const j={requestId:rId,type:'whatsapp_quote',state:'done',attempts:1,sentAt:now,providerMessageId:'FAKE-RECEIPT',message:'ORIGINAL',target:'+5592999990033',manualSelection:{recipientId:cId,actor:actor.name,at:now,suggested:false},updatedAt:now,createdAt:now,nextAttemptAt:now};await put(jobId,'integration_job',j);
 const input={id:jobId,version:1,reason:'TESTE LOCAL excluir da lista preservando recibo'};
 for(const role of ['financeiro','solicitante','geral'])await assert.rejects(api.removeQuotationJob(db,input,{...actor,role},now),e=>e.status===403);
 await assert.rejects(api.removeQuotationJob(db,{...input,version:99},actor,now),e=>e.status===409);
 await assert.rejects(api.removeQuotationJob(db,{...input,reason:''},actor,now));
 for(const state of ['running','uncertain']){await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({...j,state}),jobId).run();await assert.rejects(api.removeQuotationJob(db,input,actor,now),e=>e.status===409);}
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify(j),jobId).run();await put('closing','budget_closing',{month:'2026-11',status:'Concluído'});await assert.rejects(api.removeQuotationJob(db,input,actor,now),e=>e.status===409);await db.prepare("UPDATE records SET data='{}' WHERE id='closing'").run();
 await api.removeQuotationJob(db,input,actor,now);let removed=await api.row(db,jobId,'integration_job');assert.equal(removed.state,'done');assert.equal(removed.providerMessageId,j.providerMessageId);assert.equal(removed.message,j.message);assert.equal(removed.removed.by,actor.name);
 let choice=(await api.quotationContactsSnapshot(db,r,now)).choices[0];assert.equal(choice.lastSent.id,jobId,'warning survives removal');
 await assert.rejects(api.enqueueSelectedContacts(db,r,[choice.selection],actor.name,now,{WHATSAPP_SEND_ENABLED:'true'}),/enviada|reenvio/);
 const next=(await api.enqueueSelectedContacts(db,r,[{...choice.selection,resendOf:choice.lastSent}],actor.name,now,{WHATSAPP_SEND_ENABLED:'true'},crypto.randomUUID()))[0];assert.notEqual(next,jobId);
 await api.restoreQuotationJob(db,{...input,version:removed.version,reason:'TESTE LOCAL restaurar histórico sem reenviar'},actor,now);const restored=await api.row(db,jobId,'integration_job');assert.equal(restored.removed,undefined);assert.equal(restored.state,'done');assert.equal(restored.providerMessageId,j.providerMessageId);
 const draft=await api.row(db,next,'integration_job');await api.removeQuotationJob(db,{...input,id:next,version:draft.version},actor,now);removed=await api.row(db,next,'integration_job');assert.equal(removed.state,'cancelled');
 await api.restoreQuotationJob(db,{...input,id:next,version:removed.version},actor,now);assert.equal((await api.row(db,next,'integration_job')).state,'cancelled');assert.equal(await api.claimJob(db,{WHATSAPP_SEND_ENABLED:'true'},now,true),null,'restore never rearms an old draft');
 console.log('PASS: recoverable quotation removal, permissions/version/month, original receipts, warning after removal, new identity, restore without dispatch.');
}finally{await mf.dispose()}
