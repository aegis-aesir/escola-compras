import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { requestSchema, supplierSchema, quoteSchema, quoteTotal, sectors, type Purchase, type Supplier, type Settings } from '../../model';
import { z } from 'zod';
import { transition, FlowError, localExpired } from '../../workflow';
import { advanceDeadlines, enqueueSearch, enqueueQuotation, integrationSnapshot, retryJob, reviewMessage } from '../../../lib/integrations';
export const dynamic = 'force-dynamic';
const initial:Settings = {name:'Colégio Estrelas',legalName:'Centro Educacional Estrelas do Amanhã LTDA',minQuotes:3,departments:sectors};
class AppError extends Error {constructor(message:string,public status=400){super(message)}}
async function context(){
  const user=await getChatGPTUser(); if(!user)throw new AppError('Entre para continuar.',401);
  const db=env.DB!;
  await db.prepare('INSERT OR IGNORE INTO school (id, owner, data) VALUES (1, ?, ?)').bind(user.userId,JSON.stringify(initial)).run();
  const school=await db.prepare('SELECT * FROM school WHERE id=1').first<{owner:string;data:string}>();
  const rows=await db.prepare('SELECT * FROM records').all<{id:string;kind:string;data:string;version:number}>();
  const all=rows.results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,version:r.version}));
  const member=all.find(r=>r.kind==='member'&&r.email===user.email.toLowerCase());
  if(school!.owner!==user.userId&&!member)throw new AppError('Seu acesso ainda não foi cadastrado pela administração.',403);
  const me={id:user.userId,name:user.displayName,email:user.email,role:school!.owner===user.userId?'admin':({compras:'administrativo',aprovador:'geral'} as Record<string,string>)[member.role]||member.role,department:member?.department||'Administrativo'};
  return {db,all,me,settings:JSON.parse(school!.data) as Settings};
}
function fail(e:unknown){if(e instanceof z.ZodError)return Response.json({error:e.issues[0]?.message||'Confira os campos.'},{status:400}); if(e instanceof AppError || e instanceof FlowError)return Response.json({error:e.message},{status:e.status}); console.error('Data operation failed',e instanceof Error?e.message:'unknown');return Response.json({error:'Não foi possível salvar. Tente novamente.'},{status:500});}
export async function GET(){try{
  let {db,all,me,settings}=await context();
  if(me.role!=='solicitante'&&await advanceDeadlines(db,new Date().toISOString()))({all}=await context());
  const requests=all.filter(r=>r.kind==='request'&&(me.role!=='solicitante'||r.authorId===me.id));
  const ids=new Set(requests.map(r=>r.id));
  const activity=await db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 200').all();
  return Response.json({requests,suppliers:me.role==='solicitante'?[]:all.filter(r=>r.kind==='supplier'),members:me.role==='admin'?all.filter(r=>r.kind==='member'):[],settings,me,integrations:['admin','administrativo'].includes(me.role)?await integrationSnapshot(db,env):undefined,activity:activity.results.filter((r:any)=>me.role!=='solicitante'||ids.has(r.entity))},{headers:{'Cache-Control':'no-store'}});
}catch(e){return fail(e)}}
export async function POST(req:Request){try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new AppError('Origem inválida.',403);
  if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError('Formato inválido.');
  const raw=await req.text();if(raw.length>100000)throw new AppError('Solicitação muito grande.');
  let b:any;try{b=JSON.parse(raw)}catch{throw new AppError('Conteúdo inválido.')}
  const {db,all,me,settings}=await context();const now=new Date().toISOString();
  const permit=(roles:string[])=>{if(!roles.includes(me.role))throw new AppError('Seu perfil não permite esta ação.',403)};
  if(['research','prepare_openclaw','retry_integration','review_message'].includes(b.action)){
    permit(['admin','administrativo']);
    if(b.action==='retry_integration')await retryJob(db,b.id,b.version,me.name,now,env);
    else if(b.action==='review_message')await reviewMessage(db,b.id,b.version,b.reason,me.name,now);
    else {
      const r=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;
      if(!r)throw new AppError('Solicitação não encontrada.',404);
      if(r.version!==b.version)throw new AppError('Solicitação atualizada. Recarregue.',409);
      if(b.action==='research')await enqueueSearch(db,r,me.name,now);
      else {const s=all.find(s=>s.id===b.supplierId&&s.kind==='supplier');if(!s)throw new AppError('Fornecedor não encontrado.');await enqueueQuotation(db,r,s,me.name,now,env)}
    }
    return Response.json({ok:true});
  }
  let id:string=crypto.randomUUID(),kind='',data:any,action='',old:any;
  if(b.action==='request'){
    const input=requestSchema.parse(b.data);if(!settings.departments.includes(input.department))throw new AppError('Selecione um setor cadastrado.');
    if(me.role==='solicitante'&&input.department!==me.department)throw new AppError('Você só pode solicitar para seu setor.',403);
    kind='request';data={...input,code:'CE-'+id.slice(0,8).toUpperCase(),authorId:me.id,authorName:me.name,status:'estimating',quotes:[],createdAt:now,updatedAt:now};action='Solicitação criada';
  }else if(b.action==='supplier'){
    permit(['admin','administrativo']);kind='supplier';data=supplierSchema.parse(b.data);action='Fornecedor cadastrado';
  }else if(b.action==='member'){
    permit(['admin']);kind='member';data=z.object({email:z.string().email().transform(v=>v.toLowerCase()),name:z.string().trim().min(2).max(100),role:z.enum(['solicitante','administrativo','geral','admin']),department:z.string()}).parse(b.data);
    if(!settings.departments.includes(data.department))throw new AppError('Setor inválido.');
    old=all.find(r=>r.kind==='member'&&r.email===data.email);if(old)id=old.id;action='Acesso atualizado';
  }else if(b.action==='settings'){
    permit(['admin']);const input=z.object({minQuotes:z.number().int().min(1).max(10),departments:z.array(z.string().trim().min(2).max(80)).min(1).max(50),holidays:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100).default([])}).parse(b.data);
    if(all.some(r=>r.kind==='member'&&!input.departments.includes(r.department)))throw new AppError('Há usuários vinculados a um setor que seria removido. Atualize seus acessos primeiro.');
    await db.batch([db.prepare('UPDATE school SET data=? WHERE id=1').bind(JSON.stringify({...settings,...input,departments:[...new Set(input.departments)]})),db.prepare('INSERT INTO audit (id,entity,actor,action,at) VALUES (?,?,?,?,?)').bind(id,'school',me.name,'Regras e setores atualizados',now)]);return Response.json({ok:true});
  }else{
    old=all.find(r=>r.id===b.id&&r.kind==='request') as Purchase|undefined;if(!old)throw new AppError('Solicitação não encontrada.',404);
    if(old.version!==b.version)throw new AppError('Esta solicitação foi atualizada. Recarregue antes de continuar.',409);
    id=old.id;kind='request';data={...old,updatedAt:now};
    const result=transition(old,b,me,all.filter(r=>r.kind==='supplier'),settings,now);data=result.data;action=result.action;
  }
  const write=old?db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(data),id,old.version):db.prepare('INSERT INTO records (id,kind,data,version) VALUES (?,?,?,1)').bind(id,kind,JSON.stringify(data));
  const log=db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,me.name,action,now);
  const result=await db.batch([write,log]);if(result[0].meta.changes!==1)throw new AppError('Outra pessoa atualizou este registro. Recarregue a página.',409);
  return Response.json({ok:true,id});
}catch(e){return fail(e)}}
