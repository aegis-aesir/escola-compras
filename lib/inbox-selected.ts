import {normalizeContactPhone} from '../integrations/openclaw/contact-phone.mjs';
import {z} from 'zod';
import {hasMessageSelection} from '../integrations/openclaw/selected-message.mjs';
import {associateMessage,extractProposal} from '../app/inbox-proposals';
import {transition,FlowError} from '../app/workflow';
import {quoteSchema,type Purchase,type Supplier,type Member,type Settings} from '../app/model';
import type {InboxMessage,IntegrationJob} from '../app/integration-model';
import {digest,row,rows,type IntegrationEnv} from './integrations';

const attachmentSchema=z.object({id:z.string().regex(/^[a-f0-9]{64}$/),name:z.string().trim().min(1).max(180).refine(n=>!/[\\/\x00-\x1f]/.test(n)),sha256:z.string().regex(/^[a-f0-9]{64}$/),base64:z.string().max(7*1024*1024).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine(v=>v.length%4===0),extractedText:z.string().max(16000).optional()});
const schema=z.object({protocol:z.literal('selected-message-v1'),messageId:z.string().min(1).max(300),accountId:z.literal('operacional'),from:z.string().regex(/^\+[1-9]\d{9,14}$/),to:z.literal('+559292017107'),text:z.string().max(16000),receivedAt:z.string().datetime(),replyToMessageId:z.string().min(1).max(300).optional(),correlationJobId:z.string().min(1).max(200).optional(),selection:z.object({accountId:z.literal('operacional'),messageId:z.string(),actor:z.string().trim().min(2).max(100),at:z.string().datetime(),reason:z.string().trim().min(5).max(2000),attachmentIds:z.array(z.string()).max(20),requestId:z.string().max(200).optional()}),attachments:z.array(attachmentSchema).max(20).optional()}).superRefine((v,c)=>{if(!hasMessageSelection(v))c.addIssue({code:'custom',message:'Indicação explícita por mensagem é obrigatória.'});if(!v.text.trim()&&!v.attachments?.length)c.addIssue({code:'custom',message:'Selecione texto ou anexo.'})});
const maxBytes=5*1024*1024;
function validDocument(name:string,b:Uint8Array){
 const ext=name.split('.').pop()?.toLowerCase();
 if(ext==='pdf')return new TextDecoder().decode(b.slice(0,5))==='%PDF-';
 if(ext==='png')return [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
 if(ext==='jpg'||ext==='jpeg')return b[0]===255&&b[1]===216&&b[2]===255;
 if(['docx','xlsx','pptx'].includes(ext||''))return b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4;
 if(ext==='txt'||ext==='csv')return !b.includes(0);
 return false;
}
async function bytesHash(bytes:Uint8Array<ArrayBuffer>){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function receiveSelectedMessage(db:D1Database,input:unknown,now:string,env:IntegrationEnv={}) {
 const b=schema.parse(input); // Must precede any content persistence, including R2.
 if(Date.parse(b.receivedAt)>Date.parse(now)+300000||Date.parse(b.selection.at)>Date.parse(now)+300000)throw new FlowError('Data da mensagem/indicação inválida.');
 const id='inbox:'+await digest(JSON.stringify([b.accountId,b.messageId]));
 const contentFingerprint=await digest(JSON.stringify([b.from,b.to,b.text,b.receivedAt,b.replyToMessageId,b.correlationJobId,(b.attachments||[]).map(a=>[a.id,a.name,a.sha256,a.extractedText])]));
 const existing=await row<InboxMessage&{contentFingerprint?:string}>(db,id,'integration_inbox');
 if(existing){
  if(existing.contentFingerprint!==contentFingerprint)throw new FlowError('Identificador já existente com conteúdo diferente ou legado; histórico preservado.',409);
  return {id,duplicate:true};
 }
 const decoded=[];let size=0;
 for(const attachment of b.attachments||[]){
  const bytes=Uint8Array.from(atob(attachment.base64),c=>c.charCodeAt(0));size+=bytes.length;
  if(!bytes.length||size>maxBytes||!validDocument(attachment.name,bytes)||await bytesHash(bytes)!==attachment.sha256||attachment.id!==attachment.sha256)throw new FlowError('Anexo inválido, hash diferente ou seleção maior que 5 MB.');
  decoded.push({attachment,bytes});
 }
 if(decoded.length&&!env.BUCKET)throw new FlowError('Armazenamento privado de anexos indisponível.',503);
 const attachments:NonNullable<InboxMessage['attachments']>=[];
 for(const {attachment,bytes} of decoded){
  const key='integration-inbox/'+id.slice(6)+'/'+attachment.sha256;
  await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
  attachments.push({id:attachment.id,key,name:attachment.name,sha256:attachment.sha256,size:bytes.length,extractedText:attachment.extractedText});
 }
 const requests=await rows<Purchase>(db,'request'),suppliers=await rows<Supplier>(db,'supplier');
 const contacts=(await rows<{id:string;name:string;phone:string;removed?:unknown}>(db,'agenda_contact')).filter(c=>!c.removed&&normalizeContactPhone(c.phone)===b.from);
 const text=[b.text,...attachments.map(a=>a.extractedText||'')].filter(Boolean).join('\n');
 const link=associateMessage({...b,text},requests,suppliers,await rows<IntegrationJob>(db,'integration_job'));
 const request=requests.find(r=>r.id===link.requestId);
 const message={...b,attachments,id,contentFingerprint,state:'review',recordedAt:now,requestId:link.requestId,supplierId:link.supplierId,...(!link.supplierId&&contacts.length===1?{contactId:contacts[0].id,contactName:contacts[0].name}:{}),link,proposal:request?extractProposal(text,request):undefined};
 // Base64 only exists in the transient payload. Never store it in records/audit.
 const result=await db.batch([
  db.prepare('INSERT OR IGNORE INTO records (id,kind,data,version) VALUES (?,\'integration_inbox\',?,1)').bind(id,JSON.stringify(message)),
  db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),request?.id||id,b.selection.actor,'Mensagem explicitamente indicada; proposta preliminar exige conferência',now)
 ]);
 if(result[0].meta.changes!==1){const concurrent=await row<{contentFingerprint:string}>(db,id,'integration_inbox');if(concurrent?.contentFingerprint!==contentFingerprint)throw new FlowError('Mensagem recebida simultaneamente com conteúdo diferente.',409)}
 return {id,duplicate:result[0].meta.changes!==1};
}
function permit(me:Pick<Member,'role'>){if(!['admin','administrativo'].includes(me.role))throw new FlowError('Seu perfil não permite conferir propostas.',403)}
export async function confirmInboxProposal(db:D1Database,input:unknown,me:Pick<Member,'role'|'name'>,settings:Settings,now:string){
 permit(me);
 const b=z.object({id:z.string(),version:z.number().int().positive(),requestId:z.string(),requestVersion:z.number().int().positive(),supplierVersion:z.number().int().positive(),reportedTotal:z.number().nonnegative().max(1000000000).optional(),discrepancyReason:z.string().trim().max(1000).optional(),data:quoteSchema}).parse(input);
 const m=await row<InboxMessage>(db,b.id,'integration_inbox');
 if(!m||m.protocol!=='selected-message-v1')throw new FlowError('Mensagem não selecionada no protocolo atual.',409);
 if(m.confirmation){if(m.confirmation.requestId!==b.requestId)throw new FlowError('Esta mensagem já foi confirmada em outro pedido.',409);return {duplicate:true,quoteId:m.confirmation.quoteId}}
 if(m.version!==b.version)throw new FlowError('Mensagem atualizada. Recarregue.',409);
 const request=await row<Purchase>(db,b.requestId,'request');
 const supplier=await row<Supplier>(db,b.data.supplierId,'supplier');
 if(!request||request.version!==b.requestVersion||!supplier||supplier.removed||supplier.version!==b.supplierVersion)throw new FlowError('Pedido ou fornecedor atualizado. Recarregue.',409);
 if(normalizeContactPhone(supplier.phone)!==m.from)throw new FlowError('O fornecedor deve corresponder ao telefone original da mensagem.');
 const result=transition(request,{action:'quote',data:b.data},me as Member,[supplier],settings,now);
 const created=result.data.quotes.find(q=>q.supplierId===supplier.id)!;
 if(b.reportedTotal!==undefined&&Math.abs(created.originalTotal!-b.reportedTotal)>0.01){
  if(!b.discrepancyReason||b.discrepancyReason.length<5)throw new FlowError('Total informado diverge do cálculo. Confira os valores e justifique a diferença.');
  created.commercial={...created.commercial,notes:[created.commercial?.notes,'Total informado: '+b.reportedTotal+'. Divergência conferida: '+b.discrepancyReason].filter(Boolean).join('\n').slice(0,2000)};
 }
 // Keep the same logical proposal id for this supplier; revisions remain in quoteHistory.
 const previous=request.quotes.find(q=>q.supplierId===supplier.id);if(previous)created.id=previous.id;
 const token=crypto.randomUUID(),data={...result.data,lastInboxConfirmation:{messageId:m.id,token}};
 const next:InboxMessage={...m,requestId:request.id,supplierId:supplier.id,state:'reviewed',reviewedAt:now,reviewedBy:me.name,confirmedQuoteId:created.id,confirmation:{actor:me.name,at:now,requestId:request.id,quoteId:created.id},proposalHistory:[...(m.proposalHistory||[]),{at:now,actor:me.name,previous:m.proposal,requestId:m.requestId,supplierId:m.supplierId}]};
 const openMonth=" AND NOT EXISTS(SELECT 1 FROM records AS closing WHERE closing.kind='budget_closing' AND json_extract(closing.data,'$.month')=COALESCE(json_extract(records.data,'$.management.referenceMonth'),json_extract(records.data,'$.form.fields.referenceMonth')) AND json_extract(closing.data,'$.status')='Concluído')";
 const updates=await db.batch([
  db.prepare("UPDATE records SET data=?,version=version+1 WHERE id=? AND kind='request' AND version=?"+openMonth+" AND EXISTS(SELECT 1 FROM records AS inbox WHERE inbox.id=? AND inbox.kind='integration_inbox' AND inbox.version=?) AND EXISTS(SELECT 1 FROM records AS supplier WHERE supplier.id=? AND supplier.kind='supplier' AND supplier.version=?)").bind(JSON.stringify(data),request.id,request.version,m.id,m.version,supplier.id,supplier.version),
  db.prepare("UPDATE records SET data=?,version=version+1 WHERE id=? AND kind='integration_inbox' AND version=? AND EXISTS(SELECT 1 FROM records AS request WHERE request.id=? AND request.version=? AND json_extract(request.data,'$.lastInboxConfirmation.token')=?)").bind(JSON.stringify(next),m.id,m.version,request.id,request.version+1,token),
  db.prepare('INSERT INTO audit (id,entity,actor,action,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),request.id,me.name,'Proposta confirmada da mensagem selecionada: '+supplier.name,now)
 ]);
 if(updates[0].meta.changes!==1||updates[1].meta.changes!==1)throw new FlowError('Mensagem/pedido atualizado ou mês fechado. Recarregue.',409);
 return {duplicate:false,quoteId:created.id};
}
