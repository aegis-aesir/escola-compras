import {lstatSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

export function safeTeamTarget(base,file){
 base=path.resolve(base);file=path.resolve(file);
 const relative=path.relative(base,file);
 if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Alvo fora do projeto: '+file);
 let current=file;
 while(true){
  if(lstatSync(current,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Alvo por link não permitido: '+current);
  if(current===base)break;
  current=path.dirname(current);
 }
}

export function writeTeamFile(base,file,text){
 safeTeamTarget(base,file);mkdirSync(path.dirname(file),{recursive:true});
 const temp=file+'.ceea-pending-'+randomUUID();
 safeTeamTarget(base,temp);
 // Exclusive creation refuses pre-existing paths; never follow/truncate a temp.
 writeFileSync(temp,text,{encoding:'utf8',flag:'wx'});
 safeTeamTarget(base,file);
 renameSync(temp,file);
}
