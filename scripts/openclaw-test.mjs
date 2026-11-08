import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { bridgeConfig, executeJob, searchSources } from '../integrations/openclaw/client.mjs';
import handler, { normalizeEvent } from '../integrations/openclaw/handler.js';
import { runOnce } from '../integrations/openclaw/runner.mjs';
import { isGoogleMapsUrl } from '../integrations/openclaw/search-utils.mjs';

test('Perplexity citations become references, never inferred prices',()=>{
  assert.deepEqual(searchSources({details:{kind:'answer',content:'R$ 10 invented',citations:[{url:'https://example.com/item'}]}}),[
    {title:'example.com',url:'https://example.com/item',description:'Fonte citada pela pesquisa. Confira preço, embalagem e disponibilidade na página.'}
  ]);
});
test('structured sources and unsafe URLs',()=>{
  assert.equal(searchSources({details:{results:[{title:'Papel',url:'https://example.com',description:'Resma'}]}}).length,1);
  assert.throws(()=>searchSources({details:{results:[{title:'Unsafe',url:'javascript:alert(1)'}]}}));
  assert.throws(()=>searchSources({details:{content:'Sem fontes'}}));
});
test('local discovery prefers Maps and falls back to local web sources',async()=>{
  assert.equal(isGoogleMapsUrl('https://maps.google.com/intl/pt-PT_pt/business/'),false,'Maps marketing page is not a business result');
  assert.equal(isGoogleMapsUrl('https://maps.google.com/preferences'),false);
  assert.equal(isGoogleMapsUrl('https://www.google.com/maps/search/?api=1&query=Papelaria'),false,'search navigation is not a discovered business');
  const calls=[];
  const config={gateway:'http://127.0.0.1:18789',gatewayToken:'test-only',canSend:false};
  const job={id:'local-search',leaseToken:'test-lease',type:'local_supplier_search',query:'Papelaria fornecedores Manaus AM'};
  const mock=async(url,options)=>{
    const body=JSON.parse(options.body);calls.push(body.args.query);
    const results=calls.length===1?[{title:'Spoof',url:'https://google.com.evil.example/maps/place/test'}]:[{title:'Loja fictícia',url:'https://example.com/manaus',snippet:'Endereço publicado'}];
    return Response.json({ok:true,result:{details:{results}}});
  };
  const result=await executeJob(config,job,mock);
  assert.equal(result.outcome,'success');assert.equal(calls.length,2);
  assert.match(calls[0],/site:google\.com\/maps/);assert.match(calls[1],/Manaus/);
  assert.equal(result.sources[0].description,'Endereço publicado');
  calls.length=0;
  const mapsResult=await executeJob(config,job,async(url,options)=>{
    calls.push(JSON.parse(options.body).args.query);
    return Response.json({ok:true,result:{details:{results:[{title:'Maps fictício',url:'https://www.google.com/maps/place/Teste'}]}}});
  });
  assert.equal(mapsResult.outcome,'success');assert.equal(calls.length,1);
  assert.match(mapsResult.sources[0].url,/google\.com\/maps/);
});
test('local test can never send and disabled send never calls gateway',async()=>{
  const config=bridgeConfig({ESTRELAS_SITE_URL:'http://127.0.0.1:5173',ESTRELAS_LOCAL_TEST:'true',INTEGRATION_SECRET:'x'.repeat(32),ESTRELAS_ENABLE_SEND:'true'});
  assert.equal(config.canSend,false);
  await assert.rejects(executeJob(config,{type:'whatsapp_quote'},()=>{throw new Error('Must not call');}),/bloqueado/);
});
const event={type:'message',action:'received',timestamp:'2026-11-08T18:00:00.000Z',context:{channelId:'whatsapp',accountId:'operacional',from:'+5592999990000',messageId:'test-message',content:'CE-12345678 proposta',metadata:{to:'+559292017107'}}};
test('hook accepts only operational direct text with valid timestamp',()=>{
  assert.equal(normalizeEvent(event).from,'+5592999990000');
  assert.equal(normalizeEvent({...event,context:{...event.context,accountId:'default'}}),null);
  assert.equal(normalizeEvent({...event,context:{...event.context,conversationId:'123@g.us'}}),null);
  assert.equal(normalizeEvent({...event,timestamp:'invalid'}),null);
});
test('hook journals repeated synthetic events in an isolated inbox',async()=>{
  const inbox=await mkdtemp(path.join(os.tmpdir(),'estrelas-inbox-test-'));
  const previous=process.env.ESTRELAS_INBOX_DIR;
  process.env.ESTRELAS_INBOX_DIR=inbox;
  try {
    await handler(event);await handler(event);
    assert.equal((await readdir(inbox)).filter(n=>n.endsWith('.json')).length,1);
  } finally {
    if(previous===undefined)delete process.env.ESTRELAS_INBOX_DIR;
    else process.env.ESTRELAS_INBOX_DIR=previous;
  }
});
test('acknowledgement retry does not send twice',async()=>{
  const stateDir=await mkdtemp(path.join(os.tmpdir(),'estrelas-test-'));
  let executed=0,polled=0,offline=true;
  const options={stateDir,execute:async job=>{executed++;return {jobId:job.id,leaseToken:job.leaseToken,outcome:'uncertain'};},site:async body=>{
    if(body.op==='poll')return {job:polled++===0?{id:'test',leaseToken:'test-lease'}:null};
    if(offline)throw new Error('network');
    return {};
  }};
  await assert.rejects(runOnce({canSend:false},options));
  offline=false;
  await runOnce({canSend:false},options);
  assert.equal(executed,1);
  assert.equal((await readdir(stateDir)).filter(n=>n.endsWith('.done')).length,1);
});
test('permanently rejected result is preserved for review without blocking the queue',async()=>{
  const stateDir=await mkdtemp(path.join(os.tmpdir(),'estrelas-rejected-test-'));
  await writeFile(path.join(stateDir,'a'.repeat(64)+'.result.json'),JSON.stringify({jobId:'invalid-result'}));
  let polls=0;
  await runOnce({canSend:false},{stateDir,site:async body=>{
    if(body.op==='result')throw Object.assign(new Error('Invalid result'),{status:400});
    polls++;return {job:null};
  }});
  assert.equal(polls,1);
  assert.equal((await readdir(stateDir)).filter(n=>n.endsWith('.review')).length,1);
});
