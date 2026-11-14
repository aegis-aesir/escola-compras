import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {runOnce} from '../integrations/openclaw/runner.mjs';
import {bridgeConfig} from '../integrations/openclaw/client.mjs';
const stateDir=await mkdtemp(join(tmpdir(),'ceea-contact-runner-'));
try {
 const config=bridgeConfig({ESTRELAS_LOCAL_TEST:'true',ESTRELAS_SITE_URL:'http://127.0.0.1:5185',INTEGRATION_SECRET:'FAKE'.repeat(16)});
 assert.equal(config.contactsSync,true);assert.equal(config.canSend,false);
 const ops=[];
 const result=await runOnce(config,{stateDir,site:async body=>{ops.push(body.op);if(body.op==='contact_sync_poll')throw Object.assign(new Error('old server'),{status:400});return {job:null}}});
 assert.deepEqual(ops,['contact_sync_poll','poll']);assert.equal(result.processed,0);assert.ok(result.contacts.error);
 const continued=await runOnce(config,{stateDir,syncContacts:async()=>{throw new Error('private provider body')},site:async()=>({job:{id:'fake-job',leaseToken:'fake-lease'}}),execute:async()=>({jobId:'fake-job',leaseToken:'fake-lease',outcome:'failure'})});
 assert.equal(continued.processed,1,'contacts failure cannot prevent unrelated jobs from finishing');
 assert.equal(JSON.stringify(continued).includes('private provider body'),false);
 console.log('PASS: contacts capability, old server compatibility, sanitized failure and existing job continuation; no provider calls.');
} finally {if(!resolve(stateDir).startsWith(join(resolve(tmpdir()),'ceea-contact-runner-')))throw new Error('Unexpected fixture cleanup path');await rm(stateDir,{recursive:true,force:true});}
