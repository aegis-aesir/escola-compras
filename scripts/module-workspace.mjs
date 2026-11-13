import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const repositoryRoot=fileURLToPath(new URL('../',import.meta.url));
export const moduleDefinitions=Object.freeze({
 estoque:{branch:'codex/estoque',port:5181},
 'conhecimento-pops':{branch:'codex/conhecimento-pops',port:5182},
 tarefas:{branch:'codex/tarefas',port:5183},
 'integracao-escolar-manager':{branch:'codex/integracao-escolar-manager',port:5184},
});
export function readModuleWorkspace(root=repositoryRoot){
 const file=path.join(root,'.ceea-worktree.json');if(!existsSync(file))return null;
 let config;try{config=JSON.parse(readFileSync(file,'utf8'))}catch{throw Error('Configuração de worktree inválida; confira .ceea-worktree.json.')}
 const expected=moduleDefinitions[config?.module];
 if(!expected||config.branch!==expected.branch||config.port!==expected.port)throw Error('Configuração de worktree inválida: módulo, branch e porta devem corresponder.');
 return {...config,...expected};
}
export function localDevelopmentBase(root=repositoryRoot){return 'http://127.0.0.1:'+(readModuleWorkspace(root)?.port||5173)}
export function developmentArguments(args,managedLinux,config=readModuleWorkspace()){
 if(!config)return [...(!managedLinux?['--port','5173']:[]),...args];
 for(let i=0;i<args.length;i++){
  const token=args[i],flag=token.split('=')[0];
  if(['--port','-p'].includes(flag)){const value=token.includes('=')?token.slice(token.indexOf('=')+1):args[++i];if(Number(value)!==config.port)throw Error(`Use a porta ${config.port} reservada ao módulo ${config.module}.`)}
  if(['--host','--hostname','-H'].includes(flag)){const value=token.includes('=')?token.slice(token.indexOf('=')+1):args[++i];if(value!=='127.0.0.1')throw Error('O servidor do módulo deve usar 127.0.0.1.')}
 }
 return ['--port',String(config.port),managedLinux?'--host':'--hostname','127.0.0.1',...args];
}
export function allowedModulePush(config,currentBranch,input){
 if(!config)return {ok:true};
 if(currentBranch!==config.branch)return {ok:false,reason:`Esta worktree deve permanecer na branch ${config.branch}.`};
 const refs=input.trim().split(/\r?\n/).filter(Boolean);
 for(const line of refs){const [localRef,,remoteRef]=line.split(/\s+/);if(localRef==='(delete)'||remoteRef!==`refs/heads/${config.branch}`)return {ok:false,reason:`Módulo ${config.module}: envie somente ${config.branch}; main, publicação e outras branches pertencem ao coordenador.`}}
 return {ok:true};
}
