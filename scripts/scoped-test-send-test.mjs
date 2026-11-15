import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {executeJob,bridgeConfig} from '../integrations/openclaw/client.mjs';
await build({stdin:{contents:"export * from './lib/integrations';export * from './integrations/openclaw/test-send-grant.mjs';",resolveDir:process.cwd()},outfile:'outputs/scoped-test-send-test.mjs',bundle:true,platform:'node',format:'esm'});
const api=await import('../outputs/scoped-test-send-test.mjs');
const now=new Date().toISOString(),issuedAt=new Date(Date.now()-1000).toISOString(),expiresAt=new Date(Date.now()+300000).toISOString();
const grant={jobId:'whatsapp:'+'a'.repeat(64),version:1,target:'+5592999990001',issuedAt,expiresAt};
assert.ok(api.parseTestSendGrant(JSON.stringify(grant),now));
for(const g of [{...grant,version:0},{...grant,target:'invalid'},{...grant,expiresAt:issuedAt},{...grant,issuedAt:new Date(Date.now()+60000).toISOString()},{...grant,expiresAt:new Date(Date.now()+3600000).toISOString()}])assert.equal(api.parseTestSendGrant(g,now),undefined);
const local=bridgeConfig({ESTRELAS_LOCAL_TEST:'true',ESTRELAS_SITE_URL:'http://127.0.0.1:5185',INTEGRATION_SECRET:'FAKE'.repeat(16),ESTRELAS_TEST_SEND_GRANT:JSON.stringify(grant),ESTRELAS_ENABLE_SEND:'true'});assert.equal(local.canSend,false);assert.equal(local.testSendGrant,undefined);
const mf=new Miniflare({modules:true,script:'export default{fetch(){return new Response("fake")}}',d1Databases:['DB']});
try {
 const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT,version INTEGER)').run();await db.prepare('CREATE TABLE audit(id TEXT PRIMARY KEY,entity TEXT,actor TEXT,action TEXT,at TEXT)').run();
 const put=async(id,kind,data)=>db.prepare('INSERT INTO records(id,kind,data,version) VALUES(?,?,?,1)').bind(id,kind,JSON.stringify(data)).run();
 const requestId=crypto.randomUUID(),supplierId=crypto.randomUUID();
 await put(requestId,'request',{code:'CE-FAKE',status:'quoting',items:[{name:'Registro TESTE',quantity:4,unit:'un.',category:'Manutenção',spec:''}],generalApproval:{at:now},form:{fields:{referenceMonth:'2026-11'}}});
 await put(supplierId,'supplier',{name:'Contato fictício',phone:grant.target,category:'TESTE',scope:'local',contact:'Contato fictício'});
 const job={requestId,type:'whatsapp_quote',state:'blocked',attempts:0,nextAttemptAt:now,createdAt:now,updatedAt:now,supplierId,supplierName:'Contato fictício',target:grant.target,accountId:'operacional',schoolPhone:'+559292017107',message:'TEXTO LONGO ANTERIOR FICTÍCIO',manualSelection:{recipientId:supplierId,actor:'TESTE LOCAL',at:now,suggested:false}};
 await put(grant.jobId,'integration_job',job);
 for(let i=0;i<8;i++)await put('other-'+i,'integration_job',{...job,target:'+55929999900'+String(10+i),state:i===7?'queued':'blocked'});
 const othersBefore=(await api.rows(db,'integration_job')).filter(j=>j.id!==grant.jobId);
 const env={WHATSAPP_SEND_ENABLED:'false',WHATSAPP_TEST_SEND_GRANT:JSON.stringify(grant)};
 assert.equal(await api.claimJob(db,env,now,false,'criteria-v1'),null,'server alone cannot authorize');
 assert.equal(await api.claimJob(db,{WHATSAPP_SEND_ENABLED:'false'},now,false,'criteria-v1',grant),null,'bridge alone cannot authorize');
 assert.equal(await api.claimJob(db,env,now,false,'criteria-v1',{...grant,target:'+5592999990099'}),null);
 assert.equal(await api.claimJob(db,{...env,WHATSAPP_TEST_SEND_GRANT:'invalid'},now,true,'criteria-v1',grant),null,'invalid scoped config fails closed even if global flag is true');
 for(const change of [{version:2},{attempts:1},{state:'uncertain'},{state:'running'},{state:'done'},{leaseToken:'unknown'},{leaseUntil:now},{sentAt:now},{providerMessageId:'receipt'},{testSend:{version:1}}]){
  await db.prepare('UPDATE records SET data=?,version=? WHERE id=?').bind(JSON.stringify({...job,...change}),change.version||1,grant.jobId).run();
  assert.equal(await api.claimJob(db,env,now,false,'criteria-v1',grant),null,'deny unsafe task '+JSON.stringify(change));
 }
 await db.prepare('UPDATE records SET data=?,version=1 WHERE id=?').bind(JSON.stringify(job),grant.jobId).run();
 await put('closing','budget_closing',{month:'2026-11',status:'Concluído'});
 assert.equal(await api.claimJob(db,env,now,false,'criteria-v1',grant),null,'month must remain open at atomic claim');
 await db.prepare("UPDATE records SET data='{}' WHERE id='closing'").run();
 assert.equal(await api.claimJob(db,{...env,WHATSAPP_TEST_SEND_GRANT:JSON.stringify({...grant,expiresAt:issuedAt})},now,true,'criteria-v1',grant),null,'expired server config fails closed');
 const race=await Promise.all([api.claimJob(db,env,now,false,'criteria-v1',grant),api.claimJob(db,env,now,false,'criteria-v1',grant)]);
 assert.equal(race.filter(Boolean).length,1);const claimed=race.find(Boolean);assert.equal(claimed.id,grant.jobId);assert.equal(claimed.attempts,1);assert.equal(claimed.version,2);
 assert.ok(claimed.message.includes('Pode confirmar pra mim:'));assert.ok(claimed.message.includes('Ref.: CE-FAKE'));assert.equal(claimed.messageHistory[0].message,job.message);
 let sends=0;const config={canSend:false,testSendGrant:grant,gateway:'http://127.0.0.1:18789',gatewayToken:'FAKE-ONLY'};
 const result=await executeJob(config,claimed,async(_url,options)=>{sends++;const body=JSON.parse(options.body);assert.equal(body.args.target,grant.target);return Response.json({ok:true,result:{details:{messageId:'FAKE-RECEIPT'}}});});
 assert.equal(sends,1);assert.equal(result.outcome,'success');
 for(const altered of [{...claimed,id:'other-7'},{...claimed,target:'+5592999990099'},{...claimed,version:3},{...claimed,testSend:undefined}])await assert.rejects(executeJob(config,altered,()=>assert.fail('must not call provider')));
 await assert.rejects(executeJob({...config,testSendGrant:{...grant,expiresAt:issuedAt}},claimed,()=>assert.fail('expired grant')));
 await api.completeJob(db,result,new Date().toISOString());assert.equal(await api.claimJob(db,env,new Date().toISOString(),false,'criteria-v1',grant),null,'same grant cannot dispatch twice');
 assert.deepEqual((await api.rows(db,'integration_job')).filter(j=>j.id!==grant.jobId),othersBefore,'seven shops and other test untouched, including a concurrent queued recipient');
 console.log('PASS: paired exact expiring grant, local ban, single concurrent claim, short draft history, simulated receipt, no reroute/retry and all other tasks untouched.');
}finally{await mf.dispose();}
