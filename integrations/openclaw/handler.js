const ACCOUNT='operacional',SCHOOL_PHONE='+559292017107';

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
  // Deliberately no capture, logging, disk write or forwarding here. Incoming
  // events and supplier-supplied metadata cannot authorize their own import.
  // Operators select one existing message with select-message.mjs or the panel.
  void event;
}
