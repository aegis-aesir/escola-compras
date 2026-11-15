import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
await build({stdin:{contents:"export * from './lib/contact-agenda'; export * from './lib/contact-sync';",resolveDir:process.cwd()},outfile:'outputs/contact-removal-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/contact-removal-test.mjs');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("fixture only")}}',d1Databases:['DB']});
try {
 const db=await mf.getD1Database('DB');
 const migration=await readFile('drizzle/'+(await readdir('drizzle')).find(n=>n.endsWith('.sql')),'utf8');
 for(const sql of migration.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 const now='2026-11-15T14:00:00.000Z',actor='TESTE LOCAL',reason='Recomeçar teste fictício';
 const contact={name:'Contato fictício preservado',phone:'+5592999990801',classification:'general',email:'fixture@example.test'};
 const put=async(id,kind,data)=>db.prepare('INSERT INTO records(id,kind,data,version) VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 const get=async id=>{const row=await db.prepare('SELECT * FROM records WHERE id=?').bind(id).first();return {...row,data:JSON.parse(row.data)}};
 const auditCount=async()=>Number((await db.prepare('SELECT COUNT(*) AS n FROM audit').first()).n);
 const removedId=crypto.randomUUID();await put(removedId,'agenda_contact',{...contact,removed:{at:now,by:actor,reason}});
 let snapshot=await api.agendaSnapshot(db,now);
 assert.equal(snapshot.entries.some(e=>e.id===removedId),false,'a tombstone must leave the active agenda');
 assert.equal(snapshot.removedEntries.find(e=>e.id===removedId).name,contact.name,'trash preserves identity and display data');
 const sync=await api.requestContactSync(db,actor,now),lease=await api.claimContactSync(db,'contacts-v1',now);
 await api.completeContactSync(db,{syncId:sync.syncId,leaseToken:lease.leaseToken,page:0,contacts:[contact],done:true,counts:{candidates:1,skipped:0}},now);
 assert.equal((await api.agendaSnapshot(db,now)).sync.contacts.length,0,'sync preview cannot reintroduce a removed phone');
 const imported=await api.importSyncedContacts(db,sync.syncId,[contact.phone],actor,now);
 assert.equal(imported.existing,1);assert.equal(imported.results[0].id,removedId);
 assert.equal((await api.importAgendaContacts(db,[contact],{kind:'csv',label:'fixture.csv'},actor,now)).existing,1);
 await assert.rejects(api.saveAgendaContact(db,{id:removedId,version:1,classification:'general',data:contact},actor,now),/restaur/i);
 assert.equal((await get(removedId)).version,1,'save/import must leave tombstone untouched');
 const before=await auditCount();
 await assert.rejects(api.restoreAgendaContact(db,{id:removedId,version:1,reason:'x'},actor,now));
 await assert.rejects(api.restoreAgendaContact(db,{id:removedId,version:2,reason},actor,now),/atualiz/i);
 assert.equal(await auditCount(),before,'rejected transitions must not create audit');
 await api.restoreAgendaContact(db,{id:removedId,version:1,reason},actor,now);
 assert.equal((await get(removedId)).version,2);assert.equal((await get(removedId)).data.removed,undefined);
 assert.equal(await auditCount(),before+1);
 await api.removeAgendaContact(db,{id:removedId,version:2,reason},actor,now);
 assert.equal((await get(removedId)).version,3);assert.deepEqual((await get(removedId)).data.removed,{at:now,by:actor,reason});
 assert.equal((await get(removedId)).kind,'agenda_contact');assert.equal(await auditCount(),before+2);
 await assert.rejects(api.removeAgendaContact(db,{id:removedId,version:3,reason},actor,now),/exclu|lixeira/i);
 const supplierId=crypto.randomUUID();await put(supplierId,'supplier',{...contact,phone:'5592999990802',contact:'Atendente',category:'Papelaria',scope:'local'});
 const job=async data=>{const id=crypto.randomUUID();await put(id,'integration_job',{type:'whatsapp_quote',attempts:0,...data});return id};
 for(const state of ['queued','blocked','running','uncertain'])for(const match of [{manualSelection:{recipientId:supplierId}},{contactId:supplierId},{supplierId},{target:'+5592999990802'}]){
  const id=await job({state,...match}),count=await auditCount();
  await assert.rejects(api.removeAgendaContact(db,{id:supplierId,version:1,reason},actor,now),/cancel|rascunho|pendente/i);
  assert.equal((await get(supplierId)).version,1);assert.equal(await auditCount(),count);
  await db.prepare('DELETE FROM records WHERE id=?').bind(id).run();
 }
 for(const ambiguity of [{attempts:1},{providerMessageId:'fixture-receipt'},{leaseToken:'fixture-lease'},{leaseUntil:now},{sentAt:now},{testSend:{fixture:true}}]){
  const id=await job({state:'failed',target:'+5592999990802',...ambiguity});
  await assert.rejects(api.removeAgendaContact(db,{id:supplierId,version:1,reason},actor,now),/cancel|rascunho|pendente/i);
  await db.prepare('DELETE FROM records WHERE id=?').bind(id).run();
 }
 for(const data of [{type:'whatsapp_quote',state:'failed',target:'+5592999990802'},{type:'whatsapp_quote',state:'failed',attempts:0,target:'+5592999990802',sentAt:null}]){
  const id=crypto.randomUUID();await put(id,'integration_job',data);
  await assert.rejects(api.removeAgendaContact(db,{id:supplierId,version:1,reason},actor,now),/cancel|rascunho|pendente/i,'incomplete/explicit-null failure metadata is ambiguous');
  await db.prepare('DELETE FROM records WHERE id=?').bind(id).run();
 }
 const historical=await job({state:'done',supplierId,supplierName:contact.name,target:'+5592999990802',providerMessageId:'receipt',sentAt:now});
 await job({state:'cancelled',supplierId});await job({state:'queued',supplierId,removed:{at:now,by:actor,reason}});await job({state:'failed',supplierId});
 const historicalBefore=await get(historical),countBeforeRace=await auditCount();
 const race=await Promise.allSettled([1,2].map(()=>api.removeAgendaContact(db,{id:supplierId,version:1,reason},actor,now)));
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'CAS permits one removal only');assert.equal(await auditCount(),countBeforeRace+1);
 assert.equal((await get(supplierId)).kind,'supplier');assert.equal((await get(supplierId)).data.name,contact.name);assert.deepEqual(await get(historical),historicalBefore,'sent receipt remains intact');
 await api.restoreAgendaContact(db,{id:supplierId,version:2,reason},actor,now);
 assert.deepEqual(await get(historical),historicalBefore,'restoration sends nothing and preserves receipts');
 assert.equal((await get(supplierId)).version,3);
 const legacyId=crypto.randomUUID(),canonicalPhone='+5592999990033';
 await put(legacyId,'agenda_contact',{name:'TESTE LOCAL legado sem DDI',phone:'92999990033',classification:'general'});
 const otherJob=await job({state:'queued',manualSelection:{recipientId:crypto.randomUUID()},target:canonicalPhone});
 await assert.rejects(api.removeAgendaContact(db,{id:legacyId,version:1,reason},actor,now),/cancel|rascunho|pendente/i,'legacy local phone matches canonical target even for another recipient');
 await db.prepare('DELETE FROM records WHERE id=?').bind(otherJob).run();
 await api.removeAgendaContact(db,{id:legacyId,version:1,reason},actor,now);
 const canonicalContact={name:'TESTE LOCAL legado importado',phone:canonicalPhone};
 const legacyImport=await api.importAgendaContacts(db,[canonicalContact],{kind:'csv',label:'legacy-fixture.csv'},actor,now);
 assert.equal(legacyImport.created,0,'import cannot resurrect a legacy tombstone via canonical phone');assert.equal(legacyImport.existing,1);assert.equal(legacyImport.results[0].id,legacyId);
 const legacySync=await api.requestContactSync(db,actor,'2026-11-15T14:01:00.000Z'),legacyLease=await api.claimContactSync(db,'contacts-v1','2026-11-15T14:01:00.000Z');
 await api.completeContactSync(db,{syncId:legacySync.syncId,leaseToken:legacyLease.leaseToken,page:0,contacts:[canonicalContact],done:true,counts:{candidates:1,skipped:0}},'2026-11-15T14:01:00.000Z');
 assert.equal((await api.agendaSnapshot(db,now)).sync.contacts.length,0,'legacy tombstone is absent from canonical sync preview');
 const legacySyncedImport=await api.importSyncedContacts(db,legacySync.syncId,[canonicalPhone],actor,now);
 assert.equal(legacySyncedImport.existing,1);assert.equal(legacySyncedImport.results[0].id,legacyId);assert.equal((await get(legacyId)).version,2);
 console.log('PASS contact removal: D1 trash, restore, CAS/audit, pending ID/phone guards, ambiguous failure, import/sync tombstones and historical receipts. No sends.');
} finally {await mf.dispose()}
