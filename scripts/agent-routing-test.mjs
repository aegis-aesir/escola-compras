import assert from 'node:assert/strict';
import {test} from 'node:test';
import {executeJob} from '../integrations/openclaw/client.mjs';
import {analyzePages} from '../integrations/openclaw/agent-estimator.mjs';
import {normalizeEvent} from '../integrations/openclaw/handler.js';

const config={gateway:'http://127.0.0.1:18789',gatewayToken:'FAKE-TEST-ONLY',canSend:false};
const item={name:'Papel A4',unit:'resma',quantity:1,spec:'75g'};
const page={url:'https://example.com/papel',title:'Papel A4',text:'Papel A4 75g por resma. R$ 20,00.'};
const needsReview={status:'needs_review',reason:'Referência fictícia exige conferência administrativa.'};
const searchJob=(type,id='job-test')=>({id,requestId:'request-test',leaseToken:'lease-test',type,query:'Papelaria fictícia Manaus',item});
const requestBody=options=>JSON.parse(options.body);

test('pesquisa, descoberta local e nacional e leitura de páginas usam coordinator por pedido',async()=>{
  for(const type of ['estimate_search','local_supplier_search','national_search']){
    const calls=[];
    const result=await executeJob(config,searchJob(type),async(_url,options)=>{
      const body=requestBody(options);calls.push(body);
      return Response.json({ok:true,result:{details:body.tool==='web_search'?{results:[{title:page.title,url:page.url}]}:page}});
    },async()=>needsReview);
    assert.equal(result.outcome,'success');assert.ok(calls.length);
    for(const body of calls){assert.equal(body.agentId,'coordinator');assert.match(body.sessionKey,/^agent:coordinator:compras-pesquisa:/);assert.notEqual(body.tool,'message');}
    if(type==='estimate_search')assert.ok(calls.some(body=>body.tool==='web_fetch'));
    if(type==='local_supplier_search')assert.equal(calls.filter(body=>body.tool==='web_search').length,2,'Maps e fallback mantêm o mesmo agente');
  }
});
test('leitura no navegador compras também usa coordinator, sem acesso ao WhatsApp',async()=>{
  const calls=[],url='https://produto.mercadolivre.com.br/MLB-123456789-papel';
  const result=await executeJob({...config,browserResearch:true},searchJob('estimate_search'),async(_url,options)=>{
    const body=requestBody(options);calls.push(body);
    let details={results:[]};
    if(body.tool==='browser')details=body.args.action==='open'?{targetId:'fake-tab'}:body.args.action==='act'?{result:{state:'ready',url,title:'Papel A4',text:page.text,links:[url]}}:{};
    return Response.json({ok:true,result:{details}});
  },async()=>needsReview);
  assert.equal(result.outcome,'success');assert.equal(result.browserResearch.state,'ready');
  assert.ok(calls.some(body=>body.tool==='browser'&&body.args.action==='close'));
  for(const body of calls){assert.equal(body.agentId,'coordinator');assert.match(body.sessionKey,/^agent:coordinator:/);if(body.tool==='browser')assert.equal(body.args.profile,'compras');}
});
test('análise estruturada usa coordinator sem mudar modelo ou permitir entrega de mensagens',async()=>{
  let params;
  const answer=await analyzePages(searchJob('estimate_search'),[page],async(_bin,args)=>{
    params=JSON.parse(args[args.indexOf('--params')+1]);
    return {stdout:JSON.stringify({status:'ok',result:{payloads:[{text:JSON.stringify(needsReview)}]}})};
  });
  assert.equal(answer.status,'needs_review');assert.equal(params.agentId,'coordinator');
  assert.match(params.sessionKey,/^agent:coordinator:compras-estimativa:/);
  assert.equal(params.deliver,false);assert.equal(params.disableMessageTool,true);
  assert.equal(params.model,undefined);assert.equal(params.modelRun,undefined);
});
test('critérios autorizados alteram a busca no navegador e chegam ao analisador sem alterar o item original',async()=>{
 const original={...item,name:'Monitor Rhadium RHA-LCD-001',spec:'Rhadium 19 polegadas'},researchItem={...item,name:'Monitor 19 polegadas',spec:'LCD 75Hz'};
 const job={...searchJob('estimate_search'),item:original,researchItem,researchCriteria:{allowSimilar:true,brandPolicy:'reference'},query:'Monitor 19 polegadas LCD 75Hz preço comprar Brasil'};
 const calls=[],url='https://produto.mercadolivre.com.br/MLB-123456789-monitor';let analyzed;
 const result=await executeJob({...config,browserResearch:true},job,async(_url,options)=>{const body=requestBody(options);calls.push(body);let details={results:[]};if(body.tool==='browser')details=body.args.action==='open'?{targetId:'fake-tab'}:body.args.action==='act'?{result:{state:'ready',url,title:'Monitor Monocron',text:'Monitor Monocron LCD 19 polegadas 75Hz. R$ 150,00.',links:[url]}}:{};return Response.json({ok:true,result:{details}})},async job=>{analyzed=job;return needsReview});
 assert.equal(result.outcome,'success');const searchUrl=calls.find(c=>c.tool==='browser'&&c.args.action==='open').args.url;assert.ok(!searchUrl.includes('Rhadium'));assert.ok(searchUrl.includes('Monitor-19-polegadas'));assert.equal(calls.find(c=>c.tool==='web_search').args.query,job.query);assert.equal(analyzed.item,original);assert.equal(analyzed.researchCriteria.allowSimilar,true);assert.ok(calls.every(c=>c.tool!=='message'));
});
test('somente envio autorizado usa operacional e preserva conta, número e idempotência',async()=>{
  const job={id:'quote-test',requestId:'request-test',leaseToken:'lease-test',type:'whatsapp_quote',accountId:'operacional',schoolPhone:'+559292017107',target:'+5592999990000',message:'TESTE FICTÍCIO — nunca enviado'};
  const calls=[];
  const transport=async(_url,options)=>{calls.push(requestBody(options));return Response.json({ok:true,result:{details:{messageId:'FAKE-MESSAGE-ID'}}});};
  await assert.rejects(executeJob(config,job,transport),/bloqueado/);assert.equal(calls.length,0);
  await assert.rejects(executeJob({...config,canSend:true},{...job,accountId:'default'},transport),/bloqueado/);assert.equal(calls.length,0);
  const sent=await executeJob({...config,canSend:true},job,transport);
  assert.equal(sent.providerMessageId,'FAKE-MESSAGE-ID');assert.equal(calls.length,1);
  const body=calls[0];assert.equal(body.agentId,'operacional');assert.match(body.sessionKey,/^agent:operacional:compras-whatsapp:/);
  assert.equal(body.args.accountId,'operacional');assert.equal(body.tool,'message');assert.equal(body.idempotencyKey,'quote-test');
});
test('falha de pesquisa não recorre ao agente operacional nem à conta default',async()=>{
  const calls=[];
  const result=await executeJob(config,searchJob('local_supplier_search'),async(_url,options)=>{
    calls.push(requestBody(options));return Response.json({ok:false},{status:404});
  });
  assert.equal(result.outcome,'error');assert.equal(calls.length,2);
  assert.ok(calls.every(body=>body.agentId==='coordinator'&&body.sessionKey.startsWith('agent:coordinator:')));
});
test('tarefas do mesmo pedido compartilham contexto de ferramenta e outro pedido fica isolado',async()=>{
  const calls=[];
  const transport=async(_url,options)=>{calls.push(requestBody(options));return Response.json({ok:true,result:{details:{results:[]}}});};
  for(const job of [searchJob('national_search','job-a'),searchJob('national_search','job-b'),{...searchJob('national_search','job-c'),requestId:'other-request'}]){
    const result=await executeJob(config,job,transport);
    assert.equal(result.jobId,job.id);assert.equal(result.leaseToken,job.leaseToken);
  }
  assert.equal(calls[0].sessionKey,calls[1].sessionKey);assert.notEqual(calls[0].sessionKey,calls[2].sessionKey);
  assert.deepEqual(calls.map(body=>body.idempotencyKey),['job-a','job-b','job-c']);
});
test('recebimento permanece na conta operacional e não encaminha metadados de anexo à pesquisa',()=>{
  const event={type:'message',action:'received',timestamp:'2026-11-10T12:00:00Z',context:{channelId:'whatsapp',accountId:'operacional',from:'+5592999990000',messageId:'FAKE-INBOX',content:'Proposta fictícia com documento no WhatsApp',metadata:{to:'+559292017107',mediaPath:'PRIVATE-ATTACHMENT-NOT-FOR-RESEARCH'}}};
  assert.equal(normalizeEvent(event).accountId,'operacional');assert.equal(normalizeEvent(event).mediaPath,undefined);
  assert.equal(normalizeEvent({...event,context:{...event.context,accountId:'default'}}),null);
});
