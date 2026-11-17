import assert from 'node:assert/strict';
import {mkdtemp,readdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import handler from '../integrations/openclaw/handler.js';
import {runOnce} from '../integrations/openclaw/runner.mjs';
import {selectMessage} from '../integrations/openclaw/selected-message.mjs';
import {prepareSelectedMessage} from '../integrations/openclaw/select-message.mjs';
const event={type:'message',action:'received',timestamp:'2026-11-17T12:00:00Z',context:{channelId:'whatsapp',accountId:'operacional',from:'+5592999990000',messageId:'fixture',content:'CE-12345678; total R$ 10,00'}};
test('hook não captura mensagens recebidas sem indicação explícita',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'selected-hook-')); const previous=process.env.ESTRELAS_INBOX_DIR;process.env.ESTRELAS_INBOX_DIR=dir;
 try {await handler(event);assert.equal((await readdir(dir)).length,0)} finally {if(previous===undefined)delete process.env.ESTRELAS_INBOX_DIR;else process.env.ESTRELAS_INBOX_DIR=previous}
});
test('runner preserva backlog antigo sem enviá-lo ao sistema',async()=>{
 const stateDir=await mkdtemp(path.join(os.tmpdir(),'selected-state-')),inboxDir=await mkdtemp(path.join(os.tmpdir(),'selected-inbox-'));let imports=0;
 await writeFile(path.join(inboxDir,'a'.repeat(64)+'.json'),JSON.stringify({messageId:'legacy',text:'não selecionado'}));
 await runOnce({canSend:false},{stateDir,inboxDir,site:async body=>{if(body.op==='inbox')imports++;return {job:null}}});
 assert.equal(imports,0);assert.ok((await readdir(inboxDir)).includes('a'.repeat(64)+'.json'));
});
test('50 legados e JSON inválido não bloqueiam mensagem explicitamente escolhida',async()=>{
 const stateDir=await mkdtemp(path.join(os.tmpdir(),'selected-state-')),inboxDir=await mkdtemp(path.join(os.tmpdir(),'selected-inbox-'));let imports=0;
 for(let i=0;i<55;i++)await writeFile(path.join(inboxDir,i.toString(16).padStart(64,'0')+'.json'),i===0?'{invalid':JSON.stringify({messageId:'legacy-'+i,text:'não selecionado'}));
 const message=selectMessage({messageId:'selected',accountId:'operacional',from:'+5592999990000',to:'+559292017107',receivedAt:'2026-11-17T12:00:00Z',text:'selecionada'},{actor:'Operador fixture',reason:'Usuário indicou a mensagem'});
 await writeFile(path.join(inboxDir,'f'.repeat(64)+'.json'),JSON.stringify(message));
 await runOnce({canSend:false},{stateDir,inboxDir,site:async body=>{if(body.op==='inbox')imports++;return {job:null}}});assert.equal(imports,1);assert.equal((await readdir(inboxDir)).filter(n=>n.endsWith('.done')).length,1);
});
test('CLI não seleciona anexos implícitos nem aceita conta pessoal',async()=>{
 const source={messageId:'selected',accountId:'operacional',from:'+5592999990000',to:'+559292017107',receivedAt:'2026-11-17T12:00:00Z',text:'escolhida',attachments:[{file:'must-not-be-read'}]};
 const options={messageId:'selected',actor:'Operador fixture',reason:'Usuário indicou a mensagem'};
 const selected=await prepareSelectedMessage(source,options);assert.equal(selected.attachments,undefined);assert.deepEqual(selected.selection.attachmentIds,[]);
 await assert.rejects(prepareSelectedMessage({...source,accountId:'default'},options));
 await assert.rejects(prepareSelectedMessage(source,{...options,messageId:'other'}));
});

test('CLI preserva evidências conflitantes e seleção de anexo sem legenda',async()=>{
 const options={messageId:'fixture',actor:'Operador fixture',reason:'Usuário indicou esta resposta'};
 const canonical={messageId:'fixture',accountId:'operacional',from:'+5592999990000',to:'+559292017107',receivedAt:'2026-11-17T12:00:00Z',text:'CE-87654321',correlationJobId:'envio-do-pedido-A',replyToMessageId:'receipt-A'};
 const selected=await prepareSelectedMessage(canonical,options);
 assert.equal(selected.correlationJobId,canonical.correlationJobId);
 assert.equal(selected.replyToMessageId,canonical.replyToMessageId);
 const dir=await mkdtemp(path.join(os.tmpdir(),'selected-captionless-')),file=path.join(dir,'escolhido.pdf');
 await writeFile(file,'%PDF-1.4\nfixture');
 const media={...event,context:{...event.context,content:''}};
 const attachment=await prepareSelectedMessage(media,{...options,attachments:[{file}]});
 assert.equal(attachment.text,'');assert.equal(attachment.attachments.length,1);
 assert.deepEqual(attachment.selection.attachmentIds,[attachment.attachments[0].id]);
 await assert.rejects(prepareSelectedMessage(media,options));
});
