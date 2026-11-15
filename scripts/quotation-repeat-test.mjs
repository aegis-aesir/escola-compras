import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
await build({stdin:{contents:"export * from './lib/quotation-contacts';export * from './lib/integrations';",resolveDir:process.cwd()},outfile:'outputs/quotation-repeat-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/quotation-repeat-test.mjs');
const mf=new Miniflare({modules:true,script:'export default{fetch(){return new Response("fake")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB'),now=new Date().toISOString(),actor='ADM TESTE',requestId=crypto.randomUUID(),contactId=crypto.randomUUID(),target='+5592999990022';
 await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT,version INTEGER)').run();await db.prepare('CREATE TABLE audit(id TEXT PRIMARY KEY,entity TEXT,actor TEXT,action TEXT,at TEXT)').run();
 const put=async(id,kind,data)=>db.prepare('INSERT INTO records VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 const r={id:requestId,version:1,code:'CE-FAKE',status:'quoting',generalApproval:{at:now},items:[{name:'Papel TESTE',category:'Papelaria',unit:'un.',quantity:4}],quotes:[],form:{fields:{referenceMonth:'2026-11'}}};
 await put(requestId,'request',r);await put(contactId,'agenda_contact',{name:'Contato TESTE',phone:target,classification:'general'});
 const oldId='whatsapp:'+'b'.repeat(64),old={requestId,type:'whatsapp_quote',target,contactId,manualSelection:{recipientId:contactId,actor,at:now,suggested:false},state:'done',attempts:1,sentAt:now,providerMessageId:'FAKE-OLD-RECEIPT',message:'TEXTO ORIGINAL',createdAt:now,updatedAt:now,nextAttemptAt:now};
 await put(oldId,'integration_job',old);
 let snapshot=await api.quotationContactsSnapshot(db,r,now),choice=snapshot.choices[0];
 assert.deepEqual(choice.lastSent,{id:oldId,version:1,sentAt:now},'already-sent warning must expose exact versioned receipt');
 await assert.rejects(api.enqueueSelectedContacts(db,r,[choice.selection],actor,now,{WHATSAPP_SEND_ENABLED:'true'}),/enviada|reenvio/);
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({...old,state:'blocked',attempts:1,sentAt:undefined,providerMessageId:undefined}),oldId).run();
 await assert.rejects(api.retryJob(db,oldId,1,actor,now,{WHATSAPP_SEND_ENABLED:'true'}),e=>e.status===409,'legacy retry must not reset attempts or bypass confirmation');
 assert.equal((await api.row(db,oldId,'integration_job')).attempts,1);
 for(const change of [{state:'failed',attempts:1},{state:'done',providerMessageId:undefined},{state:'blocked',attempts:0,leaseToken:null}]){
  await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify({...old,...change}),oldId).run();
  const updatedChoice=(await api.quotationContactsSnapshot(db,r,now)).choices[0];
  await assert.rejects(api.enqueueSelectedContacts(db,r,[{...updatedChoice.selection,...(updatedChoice.lastSent?{resendOf:updatedChoice.lastSent}:{})}],actor,now,{WHATSAPP_SEND_ENABLED:'true'},crypto.randomUUID()),e=>e.status===409,'ambiguous history must never create a new send');
  assert.equal((await api.rows(db,'integration_job')).length,1);
 }
 await db.prepare('UPDATE records SET data=? WHERE id=?').bind(JSON.stringify(old),oldId).run();
 const blockedId='whatsapp:'+'e'.repeat(64);await put(blockedId,'integration_job',{...old,state:'blocked',attempts:0,sentAt:undefined,providerMessageId:undefined});
 const blockedRace={prepare:db.prepare.bind(db),batch:async statements=>{await db.prepare('UPDATE records SET version=version+1 WHERE id=?').bind(oldId).run();return db.batch(statements)}};
 await assert.rejects(api.enqueueSelectedContacts(blockedRace,r,[{...choice.selection,resendOf:choice.lastSent}],actor,now,{WHATSAPP_SEND_ENABLED:'true'},crypto.randomUUID()),e=>e.status===409,'blocked promotion must guard the receipt version too');
 assert.equal((await api.row(db,blockedId,'integration_job')).state,'blocked');
 await db.prepare('DELETE FROM records WHERE id=?').bind(blockedId).run();await db.prepare('UPDATE records SET version=1 WHERE id=?').bind(oldId).run();
 const prior=await api.row(db,oldId,'integration_job');
 const input={...choice.selection,resendOf:choice.lastSent},operation=crypto.randomUUID(),env={WHATSAPP_SEND_ENABLED:'true'};
 const results=await Promise.allSettled([api.enqueueSelectedContacts(db,r,[input],actor,now,env,operation),api.enqueueSelectedContacts(db,r,[input],actor,now,env,operation)]);
 assert.ok(results.some(x=>x.status==='fulfilled'));const newId=results.find(x=>x.status==='fulfilled').value[0];assert.notEqual(newId,oldId);
 assert.deepEqual(await api.enqueueSelectedContacts(db,r,[input],actor,now,env,operation),[newId],'lost response retry is idempotent');
 assert.deepEqual(await api.row(db,oldId,'integration_job'),prior,'old receipt preserved exactly');
 assert.equal((await api.rows(db,'integration_job')).length,2);assert.equal((await api.row(db,newId,'integration_job')).state,'queued');
 const claimed=await api.claimJob(db,env,now,true);assert.equal(claimed.id,newId);
 await api.completeJob(db,{jobId:newId,leaseToken:claimed.leaseToken,outcome:'success',providerMessageId:'FAKE-NEW-RECEIPT',sentAt:now},now);
 snapshot=await api.quotationContactsSnapshot(db,r,now);choice=snapshot.choices[0];assert.equal(choice.lastSent.id,newId);
 await assert.rejects(api.enqueueSelectedContacts(db,r,[input],actor,now,env,crypto.randomUUID()),/atualizada|reenvio|Reabra/);
 assert.equal((await api.rows(db,'integration_job')).length,2);
 const currentRef=choice.lastSent;
 for(const mutate of [
  ()=>db.prepare('UPDATE records SET version=version+1 WHERE id=?').bind(newId).run(),
  ()=>put('closed-race','budget_closing',{month:'2026-11',status:'Concluído'})
 ]){
  const currentChoice=(await api.quotationContactsSnapshot(db,r,now)).choices[0];
  const racingDb={prepare:db.prepare.bind(db),batch:async statements=>{await mutate();return db.batch(statements)}};
  await assert.rejects(api.enqueueSelectedContacts(racingDb,r,[{...currentChoice.selection,resendOf:currentChoice.lastSent}],actor,now,env,crypto.randomUUID()),e=>e.status===409);
  assert.equal((await api.rows(db,'integration_job')).length,2,'concurrent receipt/month changes cannot create a new send');
 }
 await db.prepare("DELETE FROM records WHERE id='closed-race'").run();
 const secondId=crypto.randomUUID();await put(secondId,'agenda_contact',{name:'Segundo TESTE',phone:'+5592999990044',classification:'general'});
 const second=(await api.quotationContactsSnapshot(db,r,now)).choices.find(c=>c.selection.id===secondId);
 await Promise.allSettled([crypto.randomUUID(),crypto.randomUUID()].map(op=>api.enqueueSelectedContacts(db,r,[second.selection],actor,now,env,op)));
 assert.equal((await api.rows(db,'integration_job')).filter(j=>j.target===second.phone).length,1,'two different preparation tokens still create one pending message');
 const legacyContactId=crypto.randomUUID(),legacyPhone='+5592999990055';await put(legacyContactId,'supplier',{name:'Fornecedor legado TESTE',phone:legacyPhone,category:'Papelaria',scope:'local',contact:''});
 const legacySupplier={...(await api.row(db,legacyContactId,'supplier')),kind:'supplier'};
 const legacyChoice=(await api.quotationContactsSnapshot(db,r,now)).choices.find(c=>c.phone===legacyPhone);
 let injected=false;
 const legacyRace={prepare:db.prepare.bind(db),batch:async statements=>{if(!injected){injected=true;await api.enqueueSelectedContacts(db,r,[legacyChoice.selection],actor,now,env,crypto.randomUUID());}return db.batch(statements)}};
 await Promise.allSettled([api.enqueueQuotation(legacyRace,r,legacySupplier,actor,now,env)]);
 assert.equal((await api.rows(db,'integration_job')).filter(j=>j.target===legacyPhone&&j.state==='queued').length,1,'legacy and manual writers must share the same atomic uniqueness guard');
 const removedId=crypto.randomUUID(),removedPhone='+5592999990066';await put(removedId,'agenda_contact',{name:'Contato removido na corrida TESTE',phone:removedPhone,classification:'general'});
 const removedChoice=(await api.quotationContactsSnapshot(db,r,now)).choices.find(c=>c.phone===removedPhone);
 const removalRace={prepare:db.prepare.bind(db),batch:async statements=>{await db.prepare("UPDATE records SET data=json_set(data,'$.removed',json(?)),version=version+1 WHERE id=?").bind(JSON.stringify({at:now,by:actor,reason:'TESTE LOCAL corrida'}),removedId).run();return db.batch(statements)}};
 await assert.rejects(api.enqueueSelectedContacts(removalRace,r,[removedChoice.selection],actor,now,env,crypto.randomUUID()),e=>e.status===409);
 assert.equal((await api.rows(db,'integration_job')).filter(j=>j.target===removedPhone).length,0);
 assert.equal((await api.quotationContactsSnapshot(db,r,now)).choices.some(c=>c.phone===removedPhone),false,'removed contact cannot reappear in the picker');
 console.log('PASS: versioned sent warning, explicit consent, new identity, concurrent/network retry idempotence, old receipt preserved, stale consent refused. No real transport.');
}finally{await mf.dispose()}
