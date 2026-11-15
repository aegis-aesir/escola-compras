import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {safeTeamTarget,writeTeamFile} from './codex-team-file-safety.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const team=JSON.parse(readFileSync(path.join(root,'config/codex/team.json'),'utf8'));
const common=readFileSync(path.join(root,'config/codex/INSTRUCOES-COMUNS.md'),'utf8');
const args=process.argv.slice(2),install=args.includes('--install'),plan=args.includes('--plan');
if(args.some(a=>!['--install','--check','--plan'].includes(a))||[install,plan,args.includes('--check')].filter(Boolean).length>1)throw Error('Use --install, --check (default) ou --plan.');
const hash=text=>createHash('sha256').update(text).digest('hex');
const read=file=>existsSync(file)?readFileSync(file,'utf8'):null;
const git=(cwd,...argv)=>execFileSync('git',argv,{cwd,encoding:'utf8',windowsHide:true}).trim();
const changes=[],checks=[],receipts=[];
function managed(base,file,text,previous){
 safeTeamTarget(base,file);const existing=read(file),key=path.relative(base,file).replaceAll('\\','/');
 if(existing!==null&&existing!==text&&hash(existing)!==previous?.files?.[key])throw Error('Arquivo existente não gerenciado ou alterado manualmente: '+file);
 checks.push({file,ok:existing===text});if(existing!==text)changes.push({file,text});return [key,hash(text)];
}
function supplement(file,body){
 safeTeamTarget(root,file);
 const old=read(file);if(old===null)throw Error('Instrução existente ausente: '+file);
 const start='<!-- CEEA-SUBAGENTS-2026-11-15 -->',end='<!-- /CEEA-SUBAGENTS-2026-11-15 -->',block=start+'\n'+body+'\n'+end;
 const a=old.indexOf(start),b=old.indexOf(end);
 if((a<0)!==(b<0))throw Error('Bloco local incompleto: '+file);
 if(a>=0&&old.slice(a,b+end.length)!==block)throw Error('Bloco local alterado; preservar e revisar: '+file);
 checks.push({file,ok:a>=0});if(a<0)changes.push({file,text:old.replace(/\s*$/,'')+'\n\n'+block+'\n'});
}
if(team.maxConcurrentSubagents!==3||team.roles.length!==8||new Set(team.roles.map(r=>r.name)).size!==8)throw Error('Equipe inconsistente.');
for(const base of [...new Set([root,path.dirname(root)])]){
 const dir=path.join(base,'.codex'),receiptFile=path.join(dir,'ceea-team-installation.json');
 safeTeamTarget(base,receiptFile);
 const priorText=read(receiptFile),previous=priorText?JSON.parse(priorText):null;
 if(previous&&previous.owner!=='ceea-team')throw Error('Recibo não pertence a esta equipe.');
 const files=[managed(base,path.join(dir,'config.toml'),'# Gerenciado por scripts/configure-codex-team.mjs\n[agents]\nenabled = true\nmax_concurrent_threads_per_session = 3\n',previous)];
 for(const role of team.roles){
  const module=role.module?team.modules[role.module]:null;
  const target=role.module?path.join(root,'.worktrees',role.module):null;
  const instructions=common.replaceAll('{{ROOT}}',root.replaceAll('\\','/')).replaceAll('{{COORDINATOR_THREAD}}',team.coordinatorThread)+'\nPerfil: '+role.title+'\n'+role.scope+'\n'+(target?'Checkout exclusivo: '+target.replaceAll('\\','/')+'\nBranch: '+module.branch+'; porta local: '+module.port+'.\n':'Checkout/SHA devem ser designados explicitamente pelo coordenador; não pressupor permissão de escrita na main.\n');
  // JSON basic strings are also valid TOML basic strings for this field set.
  const content=Object.entries({name:role.name,description:role.title+' — '+role.scope,developer_instructions:instructions}).map(([k,v])=>k+' = '+JSON.stringify(v)).join('\n')+'\n';
  files.push(managed(base,path.join(dir,'agents',role.name+'.toml'),content,previous));
 }
 receipts.push({file:receiptFile,text:JSON.stringify({owner:'ceea-team',schemaVersion:1,coordinatorThread:team.coordinatorThread,files:Object.fromEntries(files)},null,2)+'\n'});
}
for(const [name,module] of Object.entries(team.modules)){
 const checkout=path.join(root,'.worktrees',name);
 if(git(checkout,'branch','--show-current')!==module.branch)throw Error('Branch inesperada: '+checkout);
 const manifest=JSON.parse(readFileSync(path.join(checkout,'.ceea-worktree.json'),'utf8'));
 if(manifest.module!==name||manifest.branch!==module.branch||manifest.port!==module.port||manifest.coordinatorThread!==team.coordinatorThread)throw Error('Manifesto inesperado: '+checkout);
 const body='## Coordenação por subagentes — atualização de 15/11/2026\n\nEste checkout é reutilizado por delegações do coordenador '+team.coordinatorThread+'. Guia vigente obrigatório: '+root.replaceAll('\\','/')+'/config/codex/EQUIPE.md. Esta atualização substitui instruções anteriores de abrir/iniciar trabalho em chat independente.\n\nAguarde tarefa concreta e reserva da worktree concedida pelo coordenador. Não reassumir autoria apenas por abrir um chat antigo. Confirme encerramento do responsável anterior; preserve commits, status, manifesto, hooks e a porta '+module.port+'. Use workdir absoluto em todas as ferramentas. Entregas retornam ao coordenador por colaboração; somente ele integra main e publica.\n\n'+(name==='compras'?'Compras e OpenClaw/Integrações compartilham este checkout em tarefas alternadas, nunca como autores simultâneos.\n\n':'')+'Documentos antigos desta branch não autorizam sobrescrever regras atuais. Não atualizar a base por reset/cópia; o coordenador concilia main preservando commits próprios antes de nova implementação quando necessário. Sem produção, credenciais ou mensagens reais durante testes.';
 supplement(path.join(checkout,'AGENTS.override.md'),body);
 supplement(path.join(checkout,'.ceea-workspace/INICIAR-MODULO.md'),body);
}
const leaseFile=path.join(root,'outputs/coordination/leases.json');
safeTeamTarget(root,leaseFile);
if(!existsSync(leaseFile))changes.push({file:leaseFile,text:JSON.stringify({schemaVersion:1,coordinatorThread:team.coordinatorThread,maxConcurrentSubagents:3,leases:{}},null,2)+'\n'});
if(plan){console.log(JSON.stringify({mode:'plan',profiles:team.roles.map(r=>r.name),targets:changes.map(c=>c.file)},null,2));process.exit(0);}
if(install){
 for(const {file,text} of [...changes,...receipts])writeTeamFile(path.dirname(root),file,text);
 console.log(JSON.stringify({mode:'installed',roles:team.roles.length,projectConfigs:2,moduleGuides:10,changedFiles:changes.length,limits:3,credentialsCopied:false}));
}else{
 const bad=checks.filter(c=>!c.ok);if(bad.length)throw Error('Instalação ausente/desatualizada: '+bad.map(c=>c.file).join(', '));
 if(!existsSync(leaseFile))throw Error('Registro de reservas ausente.');
 console.log(JSON.stringify({mode:'verified',roles:team.roles.length,projectConfigs:2,moduleGuides:10,limits:3}));
}
