import { z } from 'zod';
import { FlowError } from '../app/workflow';
import { claimJob, completeJob, receiveMessage, tick, type IntegrationEnv } from './integrations';
import { importSuppliers } from './supplier-import';

const encoder=new TextEncoder();
export async function validSignature(raw:string,timestamp:string,signature:string,secret:string,now:number) {
  if(!/^\d{13}$/.test(timestamp)||Math.abs(now-Number(timestamp))>300000||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=Uint8Array.from(signature.slice(7).match(/../g)!,hex=>parseInt(hex,16));
  return crypto.subtle.verify('HMAC',key,bytes,encoder.encode(timestamp+'.'+raw));
}
async function limitedBody(req:Request) {
  if(!req.body)return '';
  const reader=req.body.getReader();const parts:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>64000){await reader.cancel();throw new FlowError('Corpo muito grande.',413)}parts.push(value)}
  const body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length}
  return new TextDecoder('utf-8',{fatal:true}).decode(body);
}
export async function bridgeEndpoint(req:Request,env:IntegrationEnv) {
  const response=(data:object,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  if(req.method!=='POST')return response({error:'Use POST.'},405);
  if(!env.DB||!env.INTEGRATION_SECRET||env.INTEGRATION_SECRET.length<32)return response({error:'Ponte não configurada no servidor.'},503);
  if(!req.headers.get('content-type')?.includes('application/json'))return response({error:'Formato inválido.'},415);
  try {
    const raw=await limitedBody(req),now=new Date().toISOString();
    if(!await validSignature(raw,req.headers.get('x-estrelas-timestamp')||'',req.headers.get('x-estrelas-signature')||'',env.INTEGRATION_SECRET,Date.parse(now)))return response({error:'Assinatura inválida ou expirada.'},401);
    let b:any;try{b=JSON.parse(raw)}catch{return response({error:'JSON inválido.'},400)}
    if(b.op==='poll') {
      await tick(env.DB,env,now);
      return response({job:await claimJob(env.DB,env,now,b.canSend===true)});
    }
    if(b.op==='result')return response(await completeJob(env.DB,b.result,now));
    if(b.op==='inbox')return response(await receiveMessage(env.DB,b.message,now));
    if(b.op==='import_suppliers')return response(await importSuppliers(env.DB,b.batch,now));
    return response({error:'Operação desconhecida.'},400);
  }catch(e){
    if(e instanceof FlowError)return response({error:e.message},e.status);
    if(e instanceof z.ZodError)return response({error:'Dados da integração inválidos.'},400);
    // Provider bodies, headers and secrets never enter logs or browser errors.
    return response({error:'Não foi possível processar a integração.'},500);
  }
}
