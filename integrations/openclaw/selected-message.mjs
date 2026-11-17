export const INBOX_PROTOCOL='selected-message-v1';
/** Consent is produced by an operator command, never by incoming WhatsApp text. */
export function hasMessageSelection(message) {
 const s=message?.selection;
 return message?.protocol===INBOX_PROTOCOL&&message.accountId==='operacional'&&message.to==='+559292017107'&&/^\+[1-9]\d{9,14}$/.test(message.from)&&typeof message.messageId==='string'&&message.messageId.length>0&&message.messageId.length<=300&&typeof message.text==='string'&&message.text.length<=16000&&Number.isFinite(Date.parse(message.receivedAt))&&s?.messageId===message.messageId&&s?.accountId==='operacional'&&typeof s?.actor==='string'&&s.actor.trim().length>=2&&s.actor.length<=100&&typeof s?.reason==='string'&&s.reason.trim().length>=5&&s.reason.length<=2000&&Number.isFinite(Date.parse(s?.at))&&Array.isArray(s?.attachmentIds)&&s.attachmentIds.length<=20&&new Set(s.attachmentIds).size===s.attachmentIds.length&&Array.isArray(message.attachments||[])&&(message.attachments||[]).every(a=>s.attachmentIds.includes(a.id))&&s.attachmentIds.length===(message.attachments||[]).length;
}
export function selectMessage(message,{actor,reason,at=new Date().toISOString(),requestId}={}) {
 const selected={...message,protocol:INBOX_PROTOCOL,selection:{accountId:'operacional',messageId:message.messageId,actor,reason,at,attachmentIds:(message.attachments||[]).map(a=>a.id),...(requestId?{requestId}:{})}};
 if(!hasMessageSelection(selected))throw new Error('Selecione uma mensagem e informe autor/motivo da indicação explícita.');
 return selected;
}
