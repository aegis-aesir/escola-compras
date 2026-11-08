import assert from 'node:assert/strict';
import {extractReference} from '../integrations/openclaw/price-evidence.mjs';
import {executeJob} from '../integrations/openclaw/client.mjs';
import {analyzePages} from '../integrations/openclaw/agent-estimator.mjs';
const item={name:'Assento sanitário oval',spec:'marca qualquer',unit:'un.',quantity:5};
const page={url:'https://example.com/item',title:'Assento oval branco',text:'Assento sanitário oval branco. Preço total R$ 129,90. Venda por unidade.'};
const analysis={status:'verified',sourceUrl:page.url,productName:'Assento sanitário oval branco',productQuote:'Assento sanitário oval branco.',priceAmount:129.9,currency:'BRL',priceType:'total',priceQuote:'Preço total R$ 129,90.',packageQuantity:1,unit:'un.',unitQuote:'Venda por unidade.',itemMatches:true,unitMatches:true,reason:'Formato oval e venda por unidade compatíveis com o pedido.'};
assert.equal(extractReference(item,{...page,analysis})?.unitPrice,129.9);
for(const changed of [{reason:'a'.repeat(2001)},{productName:'a'.repeat(301)},{priceAmount:13},{currency:'USD'},{priceType:'installment'},{sourceUrl:'https://evil.example/'},{productQuote:'Produto inventado'},{packageQuantity:0},{unit:'caixa'},{itemMatches:false},{unitMatches:false},{status:'needs_review'}])assert.equal(extractReference(item,{...page,analysis:{...analysis,...changed}}),null);
let agentParams;
const answer=await analyzePages({id:'test',leaseToken:'lease',item},[page],async(_bin,args)=>{agentParams=JSON.parse(args[args.indexOf('--params')+1]);return {stdout:JSON.stringify({status:'ok',result:{payloads:[{text:JSON.stringify(analysis)}]}})};});
assert.equal(answer.priceAmount,129.9);assert.equal(agentParams.agentId,'operacional');assert.equal(agentParams.disableMessageTool,true);assert.equal(agentParams.deliver,false);assert.equal(agentParams.modelRun,true);
const calls=[];
const result=await executeJob({gateway:'http://127.0.0.1:18789',gatewayToken:'test',canSend:false},{id:'test',leaseToken:'lease',type:'estimate_search',query:'teste',item},async(_url,options)=>{
 const b=JSON.parse(options.body);calls.push(b.tool);
 return Response.json({ok:true,result:{details:b.tool==='web_search'?{results:[{title:page.title,url:page.url,description:'Resumo incorreto R$ 1,00'}]}:page}});
},async()=>analysis);
assert.deepEqual(calls,['web_search','web_fetch']);assert.equal(result.priceEvidence.analysis.priceAmount,129.9);
console.log('Operational extraction: source quotes, units, value, structured agent call and no delivery passed.');
