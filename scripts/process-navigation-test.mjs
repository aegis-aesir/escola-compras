import assert from 'node:assert/strict';
import {build} from 'esbuild';

await build({
  entryPoints:['app/process-navigation.ts'],
  outfile:'outputs/process-navigation-test.mjs',
  bundle:true,
  platform:'node',
  format:'esm',
});

const navigation=await import('../outputs/process-navigation-test.mjs?test='+Date.now());

const administrativeSteps=[
  ['overview','Dashboard'],
  ['requests','Solicitação'],
  ['analysis','Análise ADM'],
  ['estimates','Estimativa'],
  ['general_approval','Aprovação Diretoria'],
  ['quotes','Cotação'],
  ['execution','Execução'],
  ['budget','Resumo Mensal'],
];

assert.deepEqual(navigation.primaryNavigationForRole('admin').map(({id,label})=>[id,label]),administrativeSteps);
assert.deepEqual(navigation.primaryNavigationForRole('administrativo').map(({id,label})=>[id,label]),administrativeSteps);
assert.deepEqual(navigation.primaryNavigationForRole('solicitante').map(({id,label})=>[id,label]),[['requests','Minhas solicitações']]);
assert.deepEqual(navigation.primaryNavigationForRole('geral').map(({id,label})=>[id,label]),[
  ['overview','Dashboard'],['general_approval','Aprovação Diretoria'],['budget','Resumo Mensal'],
]);
assert.deepEqual(navigation.primaryNavigationForRole('financeiro').map(({id,label})=>[id,label]),[
  ['requests','Solicitação'],['execution','Execução'],['budget','Resumo Mensal'],
]);

const adminAllowed=navigation.allowedViewsForRole('admin');
for(const auxiliary of ['suppliers','whatsapp','archives','settings'])assert.ok(adminAllowed.includes(auxiliary),`Master mantém acesso auxiliar a ${auxiliary}`);
assert.ok(!navigation.primaryNavigationForRole('admin').some(({id})=>['suppliers','whatsapp','archives','settings'].includes(id)),'funções auxiliares não são etapas principais');
assert.deepEqual(navigation.allowedViewsForRole('financeiro'),['budget','requests','execution'],'a fachada de permissões do Financeiro permanece compatível');
assert.deepEqual(navigation.allowedViewsForRole('geral'),['overview','general_approval','budget'],'a Diretoria Geral acompanha o processo sem receber telas operacionais');

const administrativeStatusView={
  correction:'requests',
  deferred:'requests',
  rejected:'requests',
  pending:'analysis',
  estimating:'estimates',
  admin_review:'estimates',
  general_review:'general_approval',
  quoting:'quotes',
  national:'quotes',
  execution:'execution',
  approved:'execution',
  ordered:'execution',
  received:'execution',
};
const queueViews=['requests','analysis','estimates','general_approval','quotes','execution'];
for(const [status,expectedView] of Object.entries(administrativeStatusView)){
  const request={status,archived:null};
  const matches=queueViews.filter(view=>navigation.requestMatchesView(request,view,'administrativo'));
  assert.deepEqual(matches,[expectedView],`${status} deve aparecer exclusivamente em ${expectedView}`);
  assert.equal(navigation.requestMatchesView(request,'requests','solicitante'),true,`Setor continua acompanhando ${status}`);
}

assert.equal(navigation.requestMatchesView({status:'general_review',archived:null},'general_approval','geral'),true);
assert.equal(navigation.requestMatchesView({status:'admin_review',archived:null},'general_approval','geral'),false);
assert.equal(navigation.requestMatchesView({status:'admin_review',archived:null,generalReturn:{reason:'Apurar quantidade',actor:'Diretora Geral',at:'2026-11-12T12:00:00.000Z'}},'estimates','administrativo'),true,'pedido devolvido pela Diretoria Geral volta à etapa da Diretoria Administrativa');
assert.equal(navigation.requestMatchesView({status:'admin_review',archived:null,generalReturn:{reason:'Apurar quantidade',actor:'Diretora Geral',at:'2026-11-12T12:00:00.000Z'}},'general_approval','geral'),false,'pedido devolvido sai da fila da Diretoria Geral');
assert.equal(navigation.requestMatchesView({status:'deferred',archived:null,deferred:{reason:'Próximo mês',actor:'Diretora Geral',at:'2026-11-12T12:00:00.000Z',draftId:'00000000-0000-4000-8000-000000000001',availableMonth:'2026-12'}},'requests','solicitante'),true,'setor continua acompanhando o original adiado');
assert.equal(navigation.requestMatchesView({status:'pending',archived:null},'requests','financeiro'),false,'Financeiro não acompanha solicitação antes da aprovação da Diretora Geral');
assert.equal(navigation.requestMatchesView({status:'quoting',archived:null},'requests','financeiro'),false,'Financeiro não classifica pedido sem o registro da aprovação da Diretora Geral');
assert.equal(navigation.requestMatchesView({status:'quoting',archived:null,generalApproval:{actor:'Diretora Geral TESTE',at:'2026-11-12T12:00:00.000Z',reason:'Necessidade aprovada'}},'requests','financeiro'),true,'Financeiro acompanha o pedido aprovado antes da execução em Solicitação');
assert.equal(navigation.requestMatchesView({status:'execution',archived:null},'requests','financeiro'),false,'Financeiro não mantém o pedido na fila anterior após iniciar a execução');
assert.equal(navigation.requestMatchesView({status:'execution',archived:null,generalApproval:{actor:'Diretora Geral TESTE',at:'2026-11-12T12:00:00.000Z',reason:'Necessidade aprovada'}},'execution','financeiro'),true,'Financeiro acompanha a compra aprovada na etapa Execução');
assert.equal(navigation.requestMatchesView({status:'execution',archived:{at:'2026-11-12'}},'execution','admin'),false,'arquivadas não permanecem nas filas ativas');
assert.equal(navigation.requestMatchesView({status:'execution',archived:{at:'2026-11-12'}},'archives','admin'),true,'arquivadas ficam na consulta auxiliar');

assert.deepEqual(navigation.contextualActionsForView('requests','admin'),[{view:'archives',label:'Arquivadas'}],'Master abre arquivadas dentro de Solicitação');
assert.deepEqual(navigation.contextualActionsForView('requests','administrativo'),[],'Diretoria Administrativa não recebe o controle exclusivo de arquivamento');
assert.deepEqual(navigation.contextualActionsForView('quotes','admin'),[
  {view:'suppliers',label:'Fornecedores'},
  {view:'whatsapp',label:'Agente WhatsApp'},
]);
assert.deepEqual(navigation.contextualActionsForView('quotes','administrativo'),[
  {view:'suppliers',label:'Fornecedores'},
  {view:'whatsapp',label:'Agente WhatsApp'},
]);
assert.deepEqual(navigation.contextualActionsForView('requests','solicitante'),[],'Setor mantém a tela simples');

console.log('PASS: menu por perfil e filas exclusivas seguem as etapas do processo orçamentário.');
