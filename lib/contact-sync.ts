import {z} from 'zod';
import type {ContactDraft,ContactSyncView} from '../app/contact-model';
import {FlowError} from '../app/workflow';
import {row,digest} from './integrations';
import {contactDraftSchema} from './contact-validation';

const syncId='agenda:sync',kind='agenda_contact_sync',capId='agenda:bridge',capKind='agenda_bridge';
type Sync=ContactSyncView&{id:string;version:number;leaseToken?:string;leaseUntil?:string;nextPage:number;pageHashes:Record<string,string>};
const errors:Record<string,string>={source_unavailable:'A fonte de contatos do WhatsApp está indisponível.',schema_unsupported:'A fonte do OpenClaw mudou. Atualize o adaptador antes de sincronizar.',limit_exceeded:'A fonte ultrapassou 5.000 contatos. Complete a agenda por arquivos menores.',read_failed:'Não foi possível consultar os contatos conhecidos. Confira a ponte.'};
async function replace(db:D1Database,old:{version:number}|null,data:object,actor:string,action:string,now:string){
 const write=old?db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND kind=? AND version=?').bind(JSON.stringify(data),syncId,kind,old.version):db.prepare('INSERT OR IGNORE INTO records(id,kind,data,version) VALUES(?,?,?,1)').bind(syncId,kind,JSON.stringify(data));
 const result=await db.batch([write,db.prepare('INSERT INTO audit(id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),syncId,actor,action,now)]);
 if(result[0].meta.changes!==1)throw new FlowError('Sincronização atualizada. Recarregue.',409);
}
export async function contactSyncSnapshot(db:D1Database,now:string){
 const current=await row<Sync>(db,syncId,kind);
 const cap=await row<{lastSeenAt:string}>(db,capId,capKind);
 const bridgeReady=!!cap&&Date.parse(now)-Date.parse(cap.lastSeenAt)<300000;
 if(!current)return {bridgeReady};
 const sync:ContactSyncView={syncId:current.syncId,state:current.state,requestedAt:current.requestedAt,requestedBy:current.requestedBy,updatedAt:current.updatedAt,contacts:current.contacts,coverage:current.coverage,error:current.error,counts:current.counts,warnings:current.warnings,...(current.state==='running'&&current.leaseUntil!<=now?{error:'A sincronização expirou. A ponte pode retomar com uma nova execução.'}:{})};
 return {bridgeReady,sync};
}
export async function requestContactSync(db:D1Database,actor:string,now:string){
 const old=await row<Sync>(db,syncId,kind);
 if(old&&(old.state==='queued'||(old.state==='running'&&old.leaseUntil!>now)))return {syncId:old.syncId};
 const data={syncId:crypto.randomUUID(),state:'queued',requestedAt:now,requestedBy:actor,updatedAt:now,coverage:'known_conversations',contacts:[],nextPage:0,pageHashes:{}};
 await replace(db,old,data,actor,'Sincronização de contatos conhecidos do WhatsApp solicitada; sem envio de mensagens',now);
 return {syncId:data.syncId};
}
export async function claimContactSync(db:D1Database,protocol:string,now:string){
 if(protocol!=='contacts-v1')return null;
 await db.prepare('INSERT INTO records(id,kind,data,version) VALUES(?,?,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=records.version+1').bind(capId,capKind,JSON.stringify({lastSeenAt:now,protocol})).run();
 const old=await row<Sync>(db,syncId,kind);
 if(!old||!(old.state==='queued'||old.state==='running'&&old.leaseUntil!<=now))return null;
 const leaseToken=crypto.randomUUID(),leaseUntil=new Date(Date.parse(now)+900000).toISOString();
 const next={...old,state:'running',contacts:[],pageHashes:{},nextPage:0,error:undefined,counts:undefined,warnings:undefined,leaseToken,leaseUntil,updatedAt:now};
 await replace(db,old,next,'Ponte OpenClaw','Leitura de contatos conhecidos iniciada; nenhuma mensagem enviada',now);
 return {syncId:old.syncId,leaseToken,leaseUntil};
}
const resultSchema=z.object({syncId:z.string().uuid(),leaseToken:z.string().uuid(),page:z.number().int().min(0).max(100),contacts:z.array(contactDraftSchema).max(50).default([]),done:z.boolean().default(false),counts:z.object({candidates:z.number().int().nonnegative(),skipped:z.number().int().nonnegative()}).optional(),error:z.enum(['source_unavailable','schema_unsupported','limit_exceeded','read_failed']).optional(),warnings:z.array(z.object({source:z.enum(['ingress','session_metadata']),error:z.enum(['source_unavailable','schema_unsupported','limit_exceeded','read_failed'])})).max(2).optional()});
export async function completeContactSync(db:D1Database,input:unknown,now:string){
 const b=resultSchema.parse(input),old=await row<Sync>(db,syncId,kind);
 if(!old||old.syncId!==b.syncId||old.leaseToken!==b.leaseToken||!old.leaseUntil||old.leaseUntil<=now)throw new FlowError('Sincronização expirada ou não reconhecida.',409);
 const hash=await digest(JSON.stringify(b));
 if(b.page<old.nextPage){if(old.pageHashes[b.page]!==hash)throw new FlowError('Página de contatos repetida com conteúdo diferente.',409);return {duplicate:true};}
 if(old.state!=='running'||b.page!==old.nextPage)throw new FlowError('Página de contatos fora de ordem.',409);
 if(!b.done&&!b.error&&!b.contacts.length)throw new FlowError('Página de contatos vazia.',400);
 const contacts=new Map(old.contacts.map(c=>[c.phone,c]));for(const c of b.contacts)if(!contacts.has(c.phone))contacts.set(c.phone,c);
 if(contacts.size>5000)throw new FlowError('A sincronização ultrapassou 5.000 contatos.',413);
 const data={...old,contacts:[...contacts.values()],state:b.error?'failed':b.done?'review':'running',error:b.error?errors[b.error]:undefined,counts:b.counts||old.counts,warnings:b.done?b.warnings:old.warnings,updatedAt:now,nextPage:b.page+1,pageHashes:{...old.pageHashes,[b.page]:hash}};
 await replace(db,old,data,'Ponte OpenClaw',b.error?'Sincronização de contatos indisponível; nenhum envio acionado':b.done?'Contatos conhecidos disponíveis para prévia administrativa':'Página de contatos recebida para prévia',now);
 return {duplicate:false};
}
export async function contactsFromSync(db:D1Database,id:string,phones:unknown):Promise<ContactDraft[]>{
 const selected=z.array(z.string()).min(1).max(50).refine(v=>new Set(v).size===v.length).parse(phones);
 const sync=await row<Sync>(db,syncId,kind);
 if(!sync||sync.syncId!==id||sync.state!=='review')throw new FlowError('A prévia de sincronização mudou. Recarregue.',409);
 return selected.map(phone=>{const found=sync.contacts.find(c=>c.phone===phone);if(!found)throw new FlowError('Contato não pertence à prévia de sincronização.',409);return found;});
}
