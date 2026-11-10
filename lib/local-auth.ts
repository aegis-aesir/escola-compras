import { scrypt, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { sectors, type Member, type Settings } from '../app/model';
import { validSignature } from './integration-endpoint';

export type LocalUser={id:string;version:number;username:string;name:string;role:Member['role'];department:string;active:boolean;mustChangePassword:boolean;passwordHash:string;createdAt:string};
type AuthEnv={DB?:D1Database;INTEGRATION_SECRET?:string};
export class AuthError extends Error {constructor(message:string,public status=400){super(message)}}
const lifetime=8*60*60*1000;
const passwordSchema=z.string().min(8,'Use pelo menos 8 caracteres.').max(128,'Use no máximo 128 caracteres.');
const usernameSchema=z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,39}$/,'Use de 3 a 40 letras, números, ponto, hífen ou sublinhado.');
const userInput=z.object({username:usernameSchema,name:z.string().trim().min(2).max(100),role:z.enum(['admin','administrativo','geral','solicitante']),department:z.string().trim().min(2).max(80)});
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string) {
  passwordSchema.parse(password);
  const salt=randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password,salt)).toString('hex')}`;
}
async function verifyPassword(password:string,stored?:string) {
  const parts=(stored||'scrypt-v1$00000000000000000000000000000000$'+'0'.repeat(64)).split('$');
  if(parts[0]!=='scrypt-v1'||!/^\w{32}$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;
  const actual=await derive(password,parts[1]);
  return timingSafeEqual(actual,Buffer.from(parts[2],'hex'))&&!!stored;
}
async function readRecord<T>(db:D1Database,id:string,kind:string):Promise<(T&{id:string;version:number})|null> {
  const r=await db.prepare('SELECT id,data,version FROM records WHERE id=? AND kind=?').bind(id,kind).first<{id:string;data:string;version:number}>();
  return r?{...JSON.parse(r.data),id:r.id,version:r.version}:null;
}
function log(db:D1Database,id:string,actor:string,action:string,now:string) {
  return db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,actor,action,now);
}
export function publicUser(u:LocalUser):Member {
  return {id:u.id,version:u.version,username:u.username,email:'',name:u.name,role:u.role,department:u.department,active:u.active,mustChangePassword:u.mustChangePassword};
}
export async function listLocalUsers(db:D1Database) {
  const rows=await db.prepare("SELECT id,data,version FROM records WHERE kind='local_user' ORDER BY id").all<{id:string;data:string;version:number}>();
  return rows.results.map(r=>publicUser({...JSON.parse(r.data),id:r.id,version:r.version}));
}
function cookieToken(cookie:string,allowDev:boolean) {
  const fields=cookie.split(';').map(p=>p.trim());
  const value=fields.find(p=>p.startsWith('__Host-estrelas_session='))?.slice('__Host-estrelas_session='.length)||
    (allowDev?fields.find(p=>p.startsWith('estrelas_session_dev='))?.slice('estrelas_session_dev='.length):undefined);
  return value&&/^[a-f0-9]{64}$/.test(value)?value:null;
}
export async function readSession(db:D1Database,cookie:string,allowDev=false):Promise<LocalUser|null> {
  const token=cookieToken(cookie,allowDev);if(!token)return null;
  const session=await readRecord<{userId:string;userVersion:number;expiresAt:number}>(db,'session:'+sha(token),'local_session');
  if(!session||session.expiresAt<=Date.now())return null;
  const user=await readRecord<LocalUser>(db,session.userId,'local_user');
  return user?.active&&session.userVersion===user.version?user:null;
}
function cookieHeader(req:Request,token:string,maxAge=28800) {
  const url=new URL(req.url),local=url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
  if(!local&&url.protocol!=='https:')throw new AuthError('Use uma conexão HTTPS.',400);
  return `${local?'estrelas_session_dev':'__Host-estrelas_session'}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${local?'':'; Secure'}`;
}
async function sessionCookie(db:D1Database,user:LocalUser,req:Request) {
  const token=randomBytes(32).toString('hex'),expiresAt=Date.now()+lifetime;
  await db.batch([
    db.prepare("DELETE FROM records WHERE kind='local_session' AND json_extract(data,'$.expiresAt')<=?").bind(Date.now()),
    db.prepare('INSERT INTO records(id,kind,data,version) VALUES (?,?,?,1)').bind('session:'+sha(token),'local_session',JSON.stringify({userId:user.id,userVersion:user.version,expiresAt})),
  ]);
  return cookieHeader(req,token);
}
// Atomic counters are consumed before password hashing. Values reveal no username/IP.
async function rateLimit(db:D1Database,identity:string,limit:number) {
  const id='auth-rate:'+sha(identity),now=Date.now(),until=now+15*60*1000;
  await db.prepare(`INSERT INTO records(id,kind,data,version) VALUES (?,'auth_rate',?,1)
    ON CONFLICT(id) DO UPDATE SET data=CASE WHEN json_extract(records.data,'$.until')<=? THEN excluded.data ELSE json_set(records.data,'$.count',json_extract(records.data,'$.count')+1) END,version=records.version+1`).bind(id,JSON.stringify({count:1,until}),now).run();
  const counter=await readRecord<{count:number;until:number}>(db,id,'auth_rate');
  if(counter!.count>limit)throw new AuthError('Muitas tentativas. Aguarde 15 minutos e tente novamente.',429);
  return id;
}
async function readBody(req:Request) {
  if(!req.headers.get('content-type')?.includes('application/json'))throw new AuthError('Formato inválido.',415);
  const reader=req.body?.getReader();if(!reader)throw new AuthError('Conteúdo inválido.');
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16000){await reader.cancel();throw new AuthError('Conteúdo muito grande.',413)}chunks.push(value)}
  const bytes=new Uint8Array(length);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length}
  return new TextDecoder().decode(bytes);
}
async function bootstrap(db:D1Database,raw:string,req:Request,env:AuthEnv,now:string) {
  if(!env.INTEGRATION_SECRET||!await validSignature(raw,req.headers.get('x-estrelas-timestamp')||'',req.headers.get('x-estrelas-signature')||'',env.INTEGRATION_SECRET,Date.now()))throw new AuthError('Inicialização não autorizada.',401);
  const b=z.object({batchId:z.string().min(8).max(100),users:z.array(userInput.extend({password:passwordSchema})).min(1).max(10)}).parse(JSON.parse(raw));
  if(!b.users.some(u=>u.role==='admin')||new Set(b.users.map(u=>u.username)).size!==b.users.length)throw new AuthError('Informe usuários únicos e ao menos um master.');
  const batchHash=sha(raw),existing=await readRecord<{batchHash:string}>(db,'auth:bootstrap','auth_state');
  if(existing){if(existing.batchHash===batchHash)return {ok:true,alreadyInitialized:true};throw new AuthError('O acesso local já foi inicializado.',409)}
  if(await db.prepare("SELECT id FROM records WHERE kind='local_user' LIMIT 1").first())throw new AuthError('O acesso local já existe.',409);
  const school=await db.prepare('SELECT data FROM school WHERE id=1').first<{data:string}>();
  const settings:Settings=school?JSON.parse(school.data):{name:'Colégio Estrelas',legalName:'Centro Educacional Estrelas do Amanhã LTDA',departments:sectors,minQuotes:3};
  if(b.users.some(u=>!settings.departments.includes(u.department)))throw new AuthError('Setor não cadastrado.');
  const users:LocalUser[]=[];
  for(const input of b.users){const {password,...fields}=input;users.push({...fields,id:'user:'+input.username,version:1,active:true,mustChangePassword:true,passwordHash:await hashPassword(password),createdAt:now})}
  const statements=[db.prepare("INSERT OR IGNORE INTO records(id,kind,data,version) SELECT 'auth:bootstrap','auth_state',?,1 WHERE NOT EXISTS(SELECT 1 FROM records WHERE kind='local_user')").bind(JSON.stringify({batchId:b.batchId,batchHash,createdAt:now}))];
  statements.push(db.prepare('INSERT OR IGNORE INTO school(id,owner,data) SELECT 1,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=\'auth:bootstrap\' AND json_extract(data,\'$.batchHash\')=?)').bind(users.find(u=>u.role==='admin')!.id,JSON.stringify(settings),batchHash));
  for(const u of users){statements.push(db.prepare("INSERT OR IGNORE INTO records(id,kind,data,version) SELECT ?,'local_user',?,1 WHERE EXISTS(SELECT 1 FROM records WHERE id='auth:bootstrap' AND json_extract(data,'$.batchHash')=?)").bind(u.id,JSON.stringify(u),batchHash),log(db,u.id,'Inicialização autorizada','Usuário local criado: '+u.username+' · '+u.role,now))}
  await db.batch(statements);
  const state=await readRecord<{batchHash:string}>(db,'auth:bootstrap','auth_state');
  if(state?.batchHash!==batchHash)throw new AuthError('Inicialização já realizada por outro processo.',409);
  return {ok:true,count:users.length};
}
export async function authEndpoint(req:Request,env:AuthEnv) {
  const reply=(body:object,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
  if(!env.DB)return reply({error:'Banco indisponível.'},503);
  if(req.method!=='POST')return reply({error:'Use POST.'},405);
  const db=env.DB,path=new URL(req.url).pathname.replace('/api/auth/',''),now=new Date().toISOString();
  try {
    if(path!=='bootstrap'&&(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site'))throw new AuthError('Origem inválida.',403);
    const raw=await readBody(req);
    if(path==='bootstrap')return reply(await bootstrap(db,raw,req,env,now));
    let b:any;try{b=JSON.parse(raw)}catch{throw new AuthError('Conteúdo inválido.')}
    const url=new URL(req.url),local=url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname);
    if(path==='login') {
      const input=z.object({username:usernameSchema,password:z.string().min(1).max(128)}).safeParse(b);
      if(!input.success)throw new AuthError('Usuário ou senha inválidos.',401);
      const {username,password}=input.data;
      await rateLimit(db,'ip:'+(req.headers.get('cf-connecting-ip')||'local'),60);
      const counter=await rateLimit(db,'login:'+username,5);
      const user=await readRecord<LocalUser>(db,'user:'+username,'local_user');
      const verified=await verifyPassword(password,user?.passwordHash);
      if(!verified||!user?.active)throw new AuthError('Usuário ou senha inválidos.',401);
      await db.prepare('DELETE FROM records WHERE id=?').bind(counter).run();
      return reply({ok:true,mustChangePassword:user.mustChangePassword},200,await sessionCookie(db,user,req));
    }
    const user=await readSession(db,req.headers.get('cookie')||'',local);
    if(!user)throw new AuthError('Entre com seu usuário e senha.',401);
    if(path==='logout') {
      const token=cookieToken(req.headers.get('cookie')||'',local);
      if(token)await db.prepare('DELETE FROM records WHERE id=?').bind('session:'+sha(token)).run();
      return reply({ok:true},200,cookieHeader(req,'',0));
    }
    if(path==='password') {
      const input=z.object({currentPassword:z.string().min(1).max(128),newPassword:passwordSchema}).parse(b);
      await rateLimit(db,'password:'+user.id,5);
      if(!await verifyPassword(input.currentPassword,user.passwordHash))throw new AuthError('Senha atual inválida.',401);
      if(input.newPassword===input.currentPassword)throw new AuthError('Escolha uma senha diferente da temporária/atual.');
      const next={...user,passwordHash:await hashPassword(input.newPassword),mustChangePassword:false};
      const result=await db.batch([db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(next),user.id,user.version),log(db,user.id,user.name,'Senha local alterada; sessões anteriores revogadas',now)]);
      if(result[0].meta.changes!==1)throw new AuthError('Usuário atualizado. Entre novamente.',409);
      await db.prepare('DELETE FROM records WHERE id=?').bind('auth-rate:'+sha('password:'+user.id)).run();
      return reply({ok:true},200,await sessionCookie(db,{...next,version:user.version+1},req));
    }
    if(user.mustChangePassword||user.role!=='admin')throw new AuthError('Seu perfil não permite administrar usuários.',403);
    const settings=JSON.parse((await db.prepare('SELECT data FROM school WHERE id=1').first<{data:string}>())!.data) as Settings;
    if(path==='users') {
      const input=userInput.parse(b);if(!settings.departments.includes(input.department))throw new AuthError('Setor não cadastrado.');
      const password=randomBytes(6).toString('base64url');
      const next:LocalUser={...input,id:'user:'+input.username,version:1,active:true,mustChangePassword:true,passwordHash:await hashPassword(password),createdAt:now};
      const result=await db.batch([db.prepare("INSERT OR IGNORE INTO records(id,kind,data,version) SELECT ?,'local_user',?,1 WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND version=?)").bind(next.id,JSON.stringify(next),user.id,user.version),log(db,next.id,user.name,'Usuário local criado: '+next.username+' · '+next.role,now)]);
      if(result[0].meta.changes!==1)throw new AuthError('Esse login já está cadastrado.',409);
      return reply({ok:true,username:next.username,temporaryPassword:password});
    }
    const targetInput=z.object({id:z.string().min(1).max(100),version:z.number().int().positive()}).parse(b);
    const target=await readRecord<LocalUser>(db,targetInput.id,'local_user');
    if(!target||target.version!==targetInput.version)throw new AuthError('Usuário atualizado ou não encontrado. Recarregue.',409);
    if(path==='users/update') {
      const input=userInput.omit({username:true}).extend({active:z.boolean()}).parse(b);
      if(!settings.departments.includes(input.department))throw new AuthError('Setor não cadastrado.');
      if(user.id===target.id&&(!input.active||input.role!=='admin'))throw new AuthError('Você não pode remover seu próprio acesso master.');
      const protectsMaster=target.role==='admin'&&target.active&&(!input.active||input.role!=='admin');
      const result=await db.batch([db.prepare(`UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?
        AND EXISTS(SELECT 1 FROM records AS actor WHERE actor.id=? AND actor.version=?)
        ${protectsMaster?"AND (SELECT COUNT(*) FROM records WHERE kind='local_user' AND json_extract(data,'$.role')='admin' AND json_extract(data,'$.active')=1)>1":''}`).bind(JSON.stringify({...target,...input}),target.id,target.version,user.id,user.version),log(db,target.id,user.name,'Perfil/acesso local atualizado: '+target.username,now)]);
      if(result[0].meta.changes!==1)throw new AuthError('Usuário atualizado por outro processo.',409);
      return reply({ok:true});
    }
    if(path==='users/reset') {
      if(target.id===user.id)throw new AuthError('Para sua própria senha, use Alterar senha.');
      const password=randomBytes(6).toString('base64url');
      const result=await db.batch([db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM records AS actor WHERE actor.id=? AND actor.version=?)').bind(JSON.stringify({...target,passwordHash:await hashPassword(password),mustChangePassword:true}),target.id,target.version,user.id,user.version),log(db,target.id,user.name,'Senha temporária emitida; sessões revogadas: '+target.username,now)]);
      if(result[0].meta.changes!==1)throw new AuthError('Usuário atualizado por outro processo.',409);
      await db.prepare('DELETE FROM records WHERE id=?').bind('auth-rate:'+sha('login:'+target.username)).run();
      return reply({ok:true,username:target.username,temporaryPassword:password});
    }
    throw new AuthError('Operação não encontrada.',404);
  }catch(error){
    if(error instanceof AuthError)return reply({error:error.message},error.status);
    if(error instanceof z.ZodError)return reply({error:error.issues[0]?.message||'Confira os campos.'},400);
    return reply({error:'Não foi possível concluir o acesso. Tente novamente.'},500);
  }
}
