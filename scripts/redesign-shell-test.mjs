import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

await build({entryPoints:['app/dashboard-shell-state.ts'],outdir:'outputs/redesign-shell',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const state=await import('../outputs/redesign-shell/dashboard-shell-state.mjs');

await build({entryPoints:['app/dashboard-shell.tsx'],outfile:'outputs/redesign-shell/dashboard-shell.mjs',bundle:true,platform:'node',format:'esm',external:['react','react-dom','lucide-react']});
const {default:DashboardShell}=await import('../outputs/redesign-shell/dashboard-shell.mjs?test='+Date.now());

assert.equal(state.parseSidebarPreference('expanded'),'expanded');
assert.equal(state.parseSidebarPreference('compact'),'compact');
assert.equal(state.parseSidebarPreference('unexpected'),'compact');
assert.equal(state.readSidebarPreference({getItem:()=>{throw new Error('storage blocked')}}),'compact');
assert.equal(state.formatManausDate(new Date('2026-11-12T14:00:00.000Z')),'quinta-feira, 12 de novembro de 2026');

const renderShell=(role,view,allowedViews)=>renderToStaticMarkup(createElement(DashboardShell,{role,view,allowedViews,userName:'Usuário Teste',roleLabel:'Teste',pendingApprovals:2,onNavigate:()=>{}},createElement('main',null,'Conteúdo')));
const adminMarkup=renderShell('admin','overview',['overview','budget','requests','analysis','estimates','general_approval','quotes','execution','suppliers','whatsapp','archives','settings']);
const expectedLabels=['Dashboard','Solicitação','Análise ADM','Estimativa','Aprovação Diretoria','Cotação','Execução','Resumo Mensal'];
let previous=-1;
for(const label of expectedLabels){
  const position=adminMarkup.indexOf(`aria-label="${label}"`);
  assert.ok(position>previous,`${label} deve aparecer na ordem do processo`);
  previous=position;
}
const primaryNavigation=adminMarkup.match(/<nav[^>]*aria-label="Navegação principal"[\s\S]*?<\/nav>/)?.[0]||'';
for(const auxiliary of ['Fornecedores','Agente WhatsApp','Arquivadas','Configurações'])assert.ok(!primaryNavigation.includes(`aria-label="${auxiliary}"`),`${auxiliary} não deve ocupar uma etapa principal`);
assert.match(adminMarkup,/aria-label="Abrir opções do usuário"/,'Configurações deve ficar na área do usuário');
assert.match(adminMarkup,/>Configurações</,'Master mantém o acesso às configurações');
for(const label of ['Abrir configurações','Alterar senha','Sair'])assert.match(adminMarkup,new RegExp(`aria-label="${label}"`),`opção ${label} precisa de nome acessível`);
assert.match(adminMarkup,/Versão 2026\.11\.12\.2/,'a versão do sistema precisa permanecer visível na área autenticada');

const sectorMarkup=renderShell('solicitante','requests',['requests']);
assert.match(sectorMarkup,/aria-label="Minhas solicitações"/,'Setor recebe uma única área contínua de acompanhamento');

const supplierMarkup=renderShell('admin','suppliers',['overview','budget','requests','analysis','estimates','general_approval','quotes','execution','suppliers','whatsapp','archives','settings']);
assert.match(supplierMarkup,/aria-current="page"[^>]*aria-label="Cotação"|aria-label="Cotação"[^>]*aria-current="page"/,'Telas auxiliares de cotação mantêm a etapa pai ativa');

const [shell,dashboard]=await Promise.all([readFile('app/dashboard-shell.tsx','utf8'),readFile('app/dashboard.tsx','utf8')]);
assert.doesNotMatch(shell,/from 'next\/(?:link|image|navigation)'/,'Vinext client shell must not load Next client helpers that duplicate the React runtime');
for(const contract of ['/estrela-2026.png','aria-expanded','aria-controls','aria-current','AppearanceControl','/alterar-senha','/api/auth/logout'])assert.ok(shell.includes(contract),`shell must preserve ${contract}`);
assert.match(shell,/role="navigation"/,'primary navigation needs an explicit landmark');
assert.match(shell,/aria-label="Navegação principal"/,'primary navigation needs an accessible name');
assert.match(shell,/className="sidebar-toggle"[\s\S]{0,220}aria-label=/,'compact sidebar toggle needs an accessible name even while its text is hidden');
assert.match(dashboard,/visibleViews\(data\.me\.role\)/,'role-based view filtering must remain the source of truth');
assert.match(dashboard,/<DashboardShell/,'dashboard must render inside the new shell');
console.log('PASS: authenticated shell state, identity, session actions and role-filtered navigation are preserved.');
