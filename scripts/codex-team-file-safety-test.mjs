import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {safeTeamTarget,writeTeamFile} from './codex-team-file-safety.mjs';

mkdirSync('outputs',{recursive:true});
const base=mkdtempSync(path.resolve('outputs/codex-team-safety-'));
const target=path.join(base,'profile.toml'),legacyTemp=target+'.ceea-pending';
writeFileSync(legacyTemp,'MANUAL FILE — KEEP');
writeTeamFile(base,target,'name = "fixture"\n');
assert.equal(readFileSync(legacyTemp,'utf8'),'MANUAL FILE — KEEP','pre-existing temporary file must be preserved');
assert.equal(readFileSync(target,'utf8'),'name = "fixture"\n');
assert.throws(()=>safeTeamTarget(base,path.join(base,'..','escape.toml')),/fora do projeto/);
let linkVerified=false;
try{
 const other=path.join(base,'other');mkdirSync(other);const link=path.join(base,'linked');symlinkSync(other,link,'junction');
 assert.throws(()=>writeTeamFile(base,path.join(link,'profile.toml'),'blocked'),/link não permitido/);
 const dangling=path.join(base,'dangling');symlinkSync(path.join(base,'missing'),dangling,'junction');
 assert.throws(()=>writeTeamFile(base,path.join(dangling,'profile.toml'),'blocked'),/link não permitido/);
 linkVerified=true;
}catch(error){if(!['EPERM','EACCES'].includes(error.code))throw error;}
console.log(JSON.stringify({manualTemporaryPreserved:true,outsidePathRejected:true,junctionRejected:linkVerified?'PASS':'SKIP: permission unavailable',fixture:base}));
