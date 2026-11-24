import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {selectMessage} from './selected-message.mjs';
import {normalizeEvent} from './handler.js';
import {bridgeConfig,callSite} from './client.mjs';

export async function prepareSelectedMessage(input,options) {
 const source=input?.type==='message'?normalizeEvent(input,{allowEmptyText:!!options.attachments?.length}):input;
 if(!source||source.messageId!==options.messageId)throw new Error('O ID indicado deve ser exatamente o da mensagem escolhida.');
 // Do not copy unknown metadata, paths, or attachments from the source event.
 const message={messageId:source.messageId,accountId:source.accountId,from:source.from,to:source.to,text:source.text||'',receivedAt:source.receivedAt,...(source.replyToMessageId?{replyToMessageId:source.replyToMessageId}:{}),...(source.correlationJobId?{correlationJobId:source.correlationJobId}:{})};
 const attachments=[];
 let size=0;
 for(const selected of options.attachments||[]) {
  if(!path.isAbsolute(selected.file))throw new Error('Indique caminho absoluto para cada anexo selecionado.');
  const bytes=await readFile(selected.file);
  size+=bytes.length;
  if(!bytes.length||size>5*1024*1024)throw new Error('Limite total de 5 MB por seleção.');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const extractedText=selected.extractedTextFile?await readFile(selected.extractedTextFile,'utf8'):undefined;
  if(extractedText?.length>16000)throw new Error('Texto extraído do anexo excede 16000 caracteres.');
  attachments.push({id:sha256,name:path.basename(selected.file),sha256,base64:bytes.toString('base64'),...(extractedText?{extractedText}:{})});
 }
 if(attachments.length)message.attachments=attachments;
 return selectMessage(message,options);
}
export async function selectCommand(args,stdin=process.stdin) {
 const value=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1]};
 const file=value('--file');if(!file)throw new Error('Use --file caminho.json ou --file - (stdin), --message-id ID --actor Nome --reason Motivo; --submit ou --out pasta.');
 let raw='';if(file==='-'){for await(const chunk of stdin)raw+=chunk}else raw=await readFile(file,'utf8');
 const manifest=value('--attachments');const attachments=manifest?JSON.parse(await readFile(manifest,'utf8')):[];
 const message=await prepareSelectedMessage(JSON.parse(raw),{messageId:value('--message-id'),actor:value('--actor'),reason:value('--reason'),requestId:value('--request-id'),attachments});
 if(args.includes('--submit'))return callSite(bridgeConfig(),{op:'inbox',message});
 const dir=value('--out');if(!dir||!path.isAbsolute(dir))throw new Error('Informe --out pasta-absoluta para preparar, ou --submit para importar somente esta mensagem.');
 await mkdir(dir,{recursive:true});
 const name=createHash('sha256').update(JSON.stringify([message.accountId,message.messageId])).digest('hex')+'.json';
 const tmp=path.join(dir,name+'.'+randomUUID()+'.tmp');await writeFile(tmp,JSON.stringify(message),{flag:'wx',mode:0o600});await rename(tmp,path.join(dir,name));
 return {selected:true,messageId:message.messageId};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 try {await selectCommand(process.argv.slice(2));console.log('Mensagem indicada explicitamente. Nenhuma outra mensagem foi capturada.')}catch(e){console.error(e.message);process.exitCode=1}
}
