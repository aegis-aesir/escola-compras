import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {currentLocalUser} from '../../local-session';
import {FlowError} from '../../workflow';
import {agendaSnapshot,importAgendaContacts,importSyncedContacts,saveAgendaContact} from '../../../lib/contact-agenda';
import {requestContactSync} from '../../../lib/contact-sync';
export const dynamic='force-dynamic';
const response=(data:object,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function context(){const user=await currentLocalUser();if(!user)throw new FlowError('Entre com seu usuário e senha.',401);if(!['admin','administrativo'].includes(user.role))throw new FlowError('Seu perfil não permite acessar a agenda de contatos.',403);if(!env.DB)throw new FlowError('Agenda indisponível.',503);return {db:env.DB,user};}
function fail(e:unknown){if(e instanceof FlowError)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues[0]?.message||'Confira os dados do contato.'},400);return response({error:'Não foi possível concluir a operação da agenda. Recarregue e tente novamente.'},500);}
export async function GET(){try{const {db}=await context();return response(await agendaSnapshot(db,new Date().toISOString()));}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 const {db,user}=await context();
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new FlowError('Origem inválida.',403);
 if(!req.headers.get('content-type')?.includes('application/json'))throw new FlowError('Formato inválido.',415);
 if(Number(req.headers.get('content-length')||0)>64000)throw new FlowError('Lote muito grande.',413);
 const reader=req.body?.getReader();let size=0;const parts:Uint8Array[]=[];
 if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>64000){await reader.cancel();throw new FlowError('Lote muito grande.',413);}parts.push(value);}
 const raw=new Uint8Array(size);let offset=0;for(const p of parts){raw.set(p,offset);offset+=p.length;}
 let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw new FlowError('JSON inválido.',400);}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new FlowError('Operação da agenda inválida.',400);
 const b=parsed as Record<string,unknown>;
 const now=new Date().toISOString();
 if(b.action==='save')return response({ok:true,...await saveAgendaContact(db,b,user.name,now)});
 if(b.action==='import')return response({ok:true,...await importAgendaContacts(db,b.contacts,b.source,user.name,now)});
 if(b.action==='request_sync')return response({ok:true,...await requestContactSync(db,user.name,now)});
 if(b.action==='import_sync')return response({ok:true,...await importSyncedContacts(db,z.string().uuid().parse(b.syncId),b.phones,user.name,now)});
 throw new FlowError('Operação da agenda desconhecida.',400);
}catch(e){return fail(e);}}
