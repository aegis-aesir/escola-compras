import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {moduleDefinitions,readModuleWorkspace,localDevelopmentBase,developmentArguments,allowedModulePush} from './module-workspace.mjs';
const root=mkdtempSync(path.join(tmpdir(),'ceea-workspace-test-'));
assert.equal(readModuleWorkspace(root),null);assert.equal(localDevelopmentBase(root),'http://127.0.0.1:5173');
const ports=new Set();
for(const [module,definition] of Object.entries(moduleDefinitions)){
 writeFileSync(path.join(root,'.ceea-worktree.json'),JSON.stringify({module,branch:definition.branch,port:definition.port}));
 const config=readModuleWorkspace(root);assert.equal(config.module,module);assert.equal(localDevelopmentBase(root),'http://127.0.0.1:'+definition.port);assert.equal(ports.has(definition.port),false);ports.add(definition.port);
 assert.deepEqual(developmentArguments([],false,config),['--port',String(definition.port),'--hostname','127.0.0.1']);
 assert.throws(()=>developmentArguments(['--port','5173'],false,config),/porta/);
 assert.throws(()=>developmentArguments(['--host','0.0.0.0'],false,config),/127\.0\.0\.1/);
 assert.equal(allowedModulePush(config,definition.branch,`refs/heads/${definition.branch} abc refs/heads/${definition.branch} def\n`).ok,true);
 assert.equal(allowedModulePush(config,definition.branch,`refs/heads/${definition.branch} abc refs/heads/main def\n`).ok,false);
 assert.equal(allowedModulePush(config,definition.branch,`refs/heads/${definition.branch} abc refs/heads/codex/outro-modulo def\n`).ok,false);
 assert.equal(allowedModulePush(config,'main',`refs/heads/main abc refs/heads/main def\n`).ok,false);
}
writeFileSync(path.join(root,'.ceea-worktree.json'),JSON.stringify({module:'estoque',port:5173,branch:'main'}));assert.throws(()=>readModuleWorkspace(root),/inválida/);
writeFileSync(path.join(root,'.ceea-worktree.json'),'{broken');assert.throws(()=>readModuleWorkspace(root),/inválida/);
console.log('PASS: quatro portas/branches isoladas, padrão do coordenador e bloqueios de configuração, host e push para main/outros módulos.');
