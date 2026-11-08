import { createHmac } from 'node:crypto';
import { isGoogleMapsUrl } from './search-utils.mjs';

export const ACCOUNT = 'operacional';
export const SCHOOL_PHONE = '+559292017107';
export function bridgeConfig(env=process.env) {
  const site=new URL(env.ESTRELAS_SITE_URL||'https://compras-escola-aegis.col-gio-estr-8349.chatgpt.site');
  const local=env.ESTRELAS_LOCAL_TEST==='true'&&['127.0.0.1','localhost'].includes(site.hostname);
  if(site.username||site.password||site.search||site.hash||site.pathname!=='/'||(!local&&site.protocol!=='https:'))throw new Error('Endereço do Site inválido.');
  if((env.INTEGRATION_SECRET||'').length<32)throw new Error('Configure INTEGRATION_SECRET no ambiente seguro.');
  if(!local&&!env.ESTRELAS_SITES_SERVICE_TOKEN)throw new Error('Configure o acesso de serviço ao Site privado.');
  const gateway=new URL(env.OPENCLAW_GATEWAY_URL||'http://127.0.0.1:18789');
  if(!['http:','https:'].includes(gateway.protocol)||!['127.0.0.1','localhost','[::1]'].includes(gateway.hostname)||gateway.username||gateway.password||gateway.pathname!=='/'||gateway.search||gateway.hash)throw new Error('O gateway deve permanecer no loopback da máquina OpenClaw.');
  return {site:site.origin,gateway:gateway.origin,secret:env.INTEGRATION_SECRET,serviceToken:env.ESTRELAS_SITES_SERVICE_TOKEN,gatewayToken:env.OPENCLAW_GATEWAY_TOKEN,canSend:env.ESTRELAS_ENABLE_SEND==='true'&&!local};
}
export async function callSite(config,body,fetcher=fetch) {
  const raw=JSON.stringify(body),timestamp=String(Date.now());
  const headers={'Content-Type':'application/json','X-Estrelas-Timestamp':timestamp,'X-Estrelas-Signature':'sha256='+createHmac('sha256',config.secret).update(timestamp+'.'+raw).digest('hex')};
  if(config.serviceToken)headers['OAI-Sites-Authorization']='Bearer '+config.serviceToken;
  const r=await fetcher(config.site+'/api/integrations/bridge',{method:'POST',headers,body:raw,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok){const error=new Error(`Site recusou a operação (${r.status}).`);error.status=r.status;throw error}
  return r.json();
}
export async function invoke(config,body,fetcher=fetch) {
  if(!config.gatewayToken)throw new Error('Configure o token local do gateway.');
  const r=await fetcher(config.gateway+'/tools/invoke',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.gatewayToken},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw new Error('Gateway indisponível ou ferramenta não autorizada.');
  const result=await r.json();
  if(result.ok!==true||result.result?.isError)throw new Error('Gateway não confirmou o resultado.');
  return result.result;
}
function structured(result) {
  if(result?.details&&typeof result.details==='object')return result.details;
  for(const part of result?.content||[])if(part.type==='text')try{return JSON.parse(part.text)}catch{/* Only structured JSON is accepted. */}
  return result;
}
export function searchSources(result) {
  const data=structured(result);
  // Synthesized answers are not price evidence. Keep only their explicit citations.
  const citations=!Array.isArray(data?.results)&&Array.isArray(data?.citations);
  const items=citations?data.citations:data?.results;
  if(data?.error||!Array.isArray(items))throw new Error('Pesquisa sem lista estruturada de fontes.');
  const sources=[];
  for(const entry of items.slice(0,5)) {
    const item=typeof entry==='string'&&citations?{url:entry}:entry;
    if(!item||typeof item.url!=='string'||item.url.length>2000)throw new Error('Fonte inválida.');
    const u=new URL(item.url);
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('Link inválido.');
    const title=typeof item.title==='string'&&item.title.trim()?item.title:u.hostname;
    const snippet=typeof item.description==='string'?item.description:item.snippet;
    sources.push({title:title.slice(0,300),url:item.url,description:citations?'Fonte citada pela pesquisa. Confira preço, embalagem e disponibilidade na página.':typeof snippet==='string'?snippet.slice(0,2000):''});
  }
  return sources;
}
export async function executeJob(config,job,fetcher=fetch) {
  const result={jobId:job.id,leaseToken:job.leaseToken};
  if(job.type==='whatsapp_quote') {
    // Never rely on OpenClaw's HTTP dryRun flag: that flag is ignored by the
    // installed gateway. Two independent switches are required before claim/send.
    if(!config.canSend||job.accountId!==ACCOUNT||job.schoolPhone!==SCHOOL_PHONE||!/^\+[1-9]\d{9,14}$/.test(job.target)||!job.message)throw new Error('Envio bloqueado.');
    try {
      const reply=structured(await invoke(config,{tool:'message',args:{action:'send',channel:'whatsapp',accountId:ACCOUNT,target:job.target,message:job.message},idempotencyKey:job.id},fetcher));
      const messageId=reply?.messageId||reply?.result?.messageId;
      if(typeof messageId!=='string'||!messageId)throw new Error('Sem identificador de envio.');
      return {...result,outcome:'success',providerMessageId:messageId,sentAt:new Date().toISOString()};
    }catch{return {...result,outcome:'uncertain'}}
  }
  if(!['estimate_search','local_supplier_search','national_search'].includes(job.type)||typeof job.query!=='string')throw new Error('Tipo de tarefa inválido.');
  try {
    if(job.type==='local_supplier_search') {
      try {
        const maps=await invoke(config,{tool:'web_search',args:{query:`${job.query} (site:google.com/maps OR site:google.com.br/maps OR site:maps.google.com)`,count:5},idempotencyKey:job.id+':maps'},fetcher);
        const sources=searchSources(maps).filter(s=>isGoogleMapsUrl(s.url));
        if(sources.length)return {...result,outcome:'success',sources};
      }catch{/* Maps may be unavailable or unindexed; use local web sources. */}
    }
    const response=await invoke(config,{tool:'web_search',args:{query:job.query,count:5},idempotencyKey:job.id},fetcher);
    return {...result,outcome:'success',sources:searchSources(response)};
  }catch{return {...result,outcome:'error'}}
}
