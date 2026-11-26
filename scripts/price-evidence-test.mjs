import assert from 'node:assert/strict';
import {extractReference,classifyEvidence} from '../integrations/openclaw/price-evidence.mjs';
import {RESEARCH_AGENT} from '../integrations/openclaw/agent-routing.mjs';
import {executeJob} from '../integrations/openclaw/client.mjs';
import {analyzePages} from '../integrations/openclaw/agent-estimator.mjs';
const item={name:'Assento sanitário oval',spec:'marca qualquer',unit:'un.',quantity:5};
const page={url:'https://example.com/item',title:'Assento oval branco',text:'Assento sanitário oval branco. Preço total R$ 129,90. Venda por unidade.'};
const analysis={status:'verified',sourceUrl:page.url,productName:'Assento sanitário oval branco',productQuote:'Assento sanitário oval branco.',priceAmount:129.9,currency:'BRL',priceType:'total',priceQuote:'Preço total R$ 129,90.',packageQuantity:1,unit:'un.',unitQuote:'Venda por unidade.',itemMatches:true,unitMatches:true,reason:'Formato oval e venda por unidade compatíveis com o pedido.'};
assert.equal(extractReference(item,{...page,analysis})?.unitPrice,129.9);
for(const changed of [{reason:'a'.repeat(2001)},{productName:'a'.repeat(301)},{priceAmount:13},{currency:'USD'},{priceType:'installment'},{sourceUrl:'https://evil.example/'},{productQuote:'Produto inventado'},{packageQuantity:0},{unit:'caixa'},{itemMatches:false},{unitMatches:false},{status:'needs_review'}])assert.equal(extractReference(item,{...page,analysis:{...analysis,...changed}}),null);
// Ticket 05 (E1): três desfechos da mesma regra — comprovado, a conferir (preço achado na
// página com comprovação incompleta, com motivo) e pendência (sem preço utilizável).
const check=changed=>classifyEvidence(item,{...page,analysis:{...analysis,...changed}});
assert.deepEqual(classifyEvidence(item,{...page,analysis}),{outcome:'verified',unitPrice:129.9});
for(const [changed,motive] of [[{itemMatches:false},/produto parecido/],[{unitMatches:false},/unidade/],[{unit:'caixa'},/unidade/],[{productQuote:'Produto inventado'},/trecho do produto/],[{unitQuote:'Caixa com 10'},/trecho da unidade/],[{priceQuote:'Preço total'},/trecho do preço/],[{status:'to_check',itemMatches:false,reason:'Modelo parecido, cor diferente.'},/produto parecido[\s\S]*Modelo parecido, cor diferente\./]]){
 const r=check(changed);
 assert.equal(r.outcome,'to_check',JSON.stringify(changed));assert.equal(r.unitPrice,129.9);assert.match(r.reason,motive);assert.ok(r.reason.length<=800);
}
assert.equal(check({packageQuantity:2,unitMatches:false}).unitPrice,64.95,'preço por unidade da embalagem');
assert.match(check({packageQuantity:0}).reason,/embalagem não confirmada/);assert.equal(check({packageQuantity:0}).unitPrice,129.9);
// Sem preço utilizável: pendência com motivo. Preço que não aparece na página nunca vira valor.
for(const changed of [{priceAmount:13},{currency:'USD'},{priceType:'installment'},{sourceUrl:'https://evil.example/'},{status:'needs_review'},{priceAmount:undefined},{priceAmount:-1}]){
 const r=check(changed);assert.equal(r.outcome,'pending',JSON.stringify(changed));assert.equal(r.unitPrice,undefined);assert.ok(r.reason.length>=10);
}
assert.equal(classifyEvidence(item,{...page,analysis:{status:'needs_review',reason:'Nenhuma página mostra preço.'}}).reason,'Nenhuma página mostra preço.');
assert.equal(classifyEvidence(item,{...page}).outcome,'pending');
let agentParams;
const answer=await analyzePages({id:'test',leaseToken:'lease',item},[page],async(_bin,args)=>{agentParams=JSON.parse(args[args.indexOf('--params')+1]);return {stdout:JSON.stringify({status:'ok',result:{payloads:[{text:JSON.stringify(analysis)}]}})};});
assert.equal(answer.priceAmount,129.9);assert.equal(agentParams.agentId,RESEARCH_AGENT);assert.equal(agentParams.disableMessageTool,true);assert.equal(agentParams.deliver,false);assert.equal(agentParams.modelRun,undefined);assert.equal(agentParams.promptMode,'minimal');assert.equal(typeof agentParams.extraSystemPrompt,'string');
const calls=[];
const result=await executeJob({gateway:'http://127.0.0.1:18789',gatewayToken:'test',canSend:false},{id:'test',leaseToken:'lease',type:'estimate_search',query:'teste',item},async(_url,options)=>{
 const b=JSON.parse(options.body);calls.push(b.tool);
 return Response.json({ok:true,result:{details:b.tool==='web_search'?{results:[{title:page.title,url:page.url,description:'Resumo incorreto R$ 1,00'}]}:page}});
},async()=>analysis);
assert.deepEqual(calls,['web_search','web_fetch']);assert.equal(result.priceEvidence.analysis.priceAmount,129.9);
// A ponte encaminha a evidência a conferir (o Site decide de novo pela mesma regra) e
// descarta a que não tem preço utilizável.
const bridge=async a=>executeJob({gateway:'http://127.0.0.1:18789',gatewayToken:'test',canSend:false},{id:'test',leaseToken:'lease',type:'estimate_search',query:'teste',item},async(_url,options)=>{const b=JSON.parse(options.body);return Response.json({ok:true,result:{details:b.tool==='web_search'?{results:[{title:page.title,url:page.url,description:''}]}:page}})},async()=>a);
assert.equal((await bridge({...analysis,status:'to_check',itemMatches:false})).priceEvidence.analysis.status,'to_check');
assert.equal((await bridge({...analysis,priceAmount:13})).priceEvidence,undefined);
const toCheckAnswer=await analyzePages({id:'test',leaseToken:'lease',item},[page],async()=>({stdout:JSON.stringify({status:'ok',result:{payloads:[{text:JSON.stringify({...analysis,status:'to_check'})}]}})}));
assert.equal(toCheckAnswer.status,'to_check','resposta a conferir do agente preservada');
assert.match(agentParams.extraSystemPrompt,/to_check/,'instruções pedem a conferir quando houver preço');
console.log('Research agent extraction: verified, to_check and pending outcomes; source quotes, units, value, structured agent call and no delivery passed.');
