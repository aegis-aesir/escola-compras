import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readModuleWorkspace,allowedModulePush,repositoryRoot} from './module-workspace.mjs';
const config=readModuleWorkspace();
const current=execFileSync('git',['branch','--show-current'],{cwd:repositoryRoot,encoding:'utf8',windowsHide:true}).trim();
const result=allowedModulePush(config,current,readFileSync(0,'utf8'));
if(!result.ok){process.stderr.write(result.reason+'\n');process.exitCode=1}
