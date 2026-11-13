import { readdir, readFile, rename, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { bridgeConfig, callSite, executeJob } from './client.mjs';

export async function runOnce(config,options={}) {
  const site=options.site||((body)=>callSite(config,body));
  const execute=options.execute||((job)=>executeJob(config,job));
  const stateDir=options.stateDir||process.env.ESTRELAS_STATE_DIR;
  if(!stateDir||!path.isAbsolute(stateDir))throw new Error('Configure ESTRELAS_STATE_DIR como pasta absoluta e privada.');
  await mkdir(stateDir,{recursive:true});
  // Replay acknowledgements, never the underlying message. A crash after a send
  // and before this journal is written leaves a server-side uncertain lease.
  for(const name of (await readdir(stateDir)).filter(n=>/^[a-f0-9]{64}\.result\.json$/.test(n))) {
    const file=path.join(stateDir,name);
    const result=JSON.parse(await readFile(file,'utf8'));
    try{await site({op:'result',result});await rename(file,file+'.done')}
    catch(e){if([400,409,413].includes(e.status))await rename(file,file+'.review');else throw new Error('Resultado pendente de confirmação no Site. Confira a tarefa antes de continuar.');}
  }
  const inbox=options.inboxDir||process.env.ESTRELAS_INBOX_DIR;
  if(inbox) {
    if(!path.isAbsolute(inbox))throw new Error('ESTRELAS_INBOX_DIR deve ser absoluta.');
    await mkdir(inbox,{recursive:true});
    for(const name of (await readdir(inbox)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).slice(0,50)) {
      const file=path.join(inbox,name),message=JSON.parse(await readFile(file,'utf8'));
      try{await site({op:'inbox',message});await rename(file,file+'.done')}
      catch(e){if([400,409].includes(e.status))await rename(file,file+'.review');else throw e}
    }
  }
  const {job}=await site({op:'poll',canSend:config.canSend,researchProtocol:'criteria-v1'});
  if(!job)return {processed:0};
  const result=await execute(job);
  const file=path.join(stateDir,createHash('sha256').update(job.id+job.leaseToken).digest('hex')+'.result.json');
  const temporary=file+'.'+randomUUID()+'.tmp';
  await writeFile(temporary,JSON.stringify(result),{flag:'wx',mode:0o600});
  await rename(temporary,file);
  await site({op:'result',result});
  await rename(file,file+'.done');
  return {processed:1};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const loop=process.argv.includes('--loop');
  try {
    const config=bridgeConfig();
    do {
      try{const result=await runOnce(config);console.log(`Ciclo concluído: ${result.processed} tarefa(s). Envio ${config.canSend?'habilitado na ponte':'desativado na ponte'}.`)}
      catch{console.error('Ciclo não concluído. Confira configurações e tarefas no painel; detalhes privados não são registrados.');if(!loop)process.exitCode=1}
      if(loop)await new Promise(resolve=>setTimeout(resolve,60000));
    }while(loop);
  }catch{console.error('Ponte não configurada. Consulte INTEGRACOES.md.');process.exitCode=1}
}
