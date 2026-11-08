import { mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { ACCOUNT, SCHOOL_PHONE } from './client.mjs';

export function normalizeEvent(event) {
  const c=event?.context;
  if(event?.type!=='message'||event.action!=='received'||c?.channelId!=='whatsapp'||c.accountId!==ACCOUNT)return null;
  // Group chats and opaque LIDs cannot be safely matched to supplier phones.
  const sender=c.metadata?.senderE164||c.from;
  if(typeof sender!=='string'||/@g\.us$|@lid$/.test(sender)||String(c.conversationId||'').endsWith('@g.us'))return null;
  const number=sender.replace(/@s\.whatsapp\.net$/,'').replace(/^whatsapp:/,'');
  const from=number.startsWith('+')?number:'+'+number;
  if(!/^\+[1-9]\d{9,14}$/.test(from)||typeof c.messageId!=='string'||!c.messageId||c.messageId.length>300||typeof c.content!=='string'||!c.content.trim()||c.content.length>16000)return null;
  const recipient=String(c.metadata?.to||'').replace(/^whatsapp:/,'').replace(/@s\.whatsapp\.net$/,'');
  if(recipient&&'+'+recipient.replace(/^\+/,'')!==SCHOOL_PHONE)return null;
  const received=new Date(event.timestamp);
  if(!Number.isFinite(received.getTime()))return null;
  return {messageId:c.messageId,accountId:ACCOUNT,from,to:SCHOOL_PHONE,text:c.content,receivedAt:received.toISOString()};
}
export default async function handler(event) {
  const message=normalizeEvent(event);
  if(!message)return;
  const spool=process.env.ESTRELAS_INBOX_DIR||path.join(os.homedir(),'.openclaw','estrelas-compras','inbox');
  if(!spool||!path.isAbsolute(spool))throw new Error('Configure uma pasta absoluta e privada para ESTRELAS_INBOX_DIR.');
  await mkdir(spool,{recursive:true});
  const name=createHash('sha256').update(JSON.stringify([message.accountId,message.messageId])).digest('hex')+'.json';
  const temporary=path.join(spool,name+'.'+randomUUID()+'.tmp');
  await writeFile(temporary,JSON.stringify(message),{flag:'wx',mode:0o600});
  await rename(temporary,path.join(spool,name));
  // No reply, model execution, or modification of OpenClaw's incoming message.
}
