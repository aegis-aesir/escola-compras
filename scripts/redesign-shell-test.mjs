import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

await build({entryPoints:['app/dashboard-shell-state.ts'],outdir:'outputs/redesign-shell',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const state=await import('../outputs/redesign-shell/dashboard-shell-state.mjs');

assert.equal(state.parseSidebarPreference('expanded'),'expanded');
assert.equal(state.parseSidebarPreference('compact'),'compact');
assert.equal(state.parseSidebarPreference('unexpected'),'compact');
assert.equal(state.readSidebarPreference({getItem:()=>{throw new Error('storage blocked')}}),'compact');
assert.equal(state.formatManausDate(new Date('2026-11-12T14:00:00.000Z')),'quinta-feira, 12 de novembro de 2026');

const [shell,dashboard]=await Promise.all([readFile('app/dashboard-shell.tsx','utf8'),readFile('app/dashboard.tsx','utf8')]);
for(const contract of ['/estrela-2026.png','aria-expanded','aria-controls','aria-current','AppearanceControl','/alterar-senha','/api/auth/logout'])assert.ok(shell.includes(contract),`shell must preserve ${contract}`);
assert.match(shell,/role="navigation"/,'primary navigation needs an explicit landmark');
assert.match(shell,/aria-label="Navegação principal"/,'primary navigation needs an accessible name');
assert.match(dashboard,/visibleViews\(data\.me\.role\)/,'role-based view filtering must remain the source of truth');
assert.match(dashboard,/<DashboardShell/,'dashboard must render inside the new shell');
console.log('PASS: authenticated shell state, identity, session actions and role-filtered navigation are preserved.');
