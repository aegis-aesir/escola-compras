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
assert.deepEqual(navigation.primaryNavigationForRole('geral').map(({id,label})=>[id,label]),[['general_approval','Aprovação Diretoria']]);
assert.deepEqual(navigation.primaryNavigationForRole('financeiro').map(({id,label})=>[id,label]),[
  ['requests','Solicitação'],['execution','Execução'],['budget','Resumo Mensal'],
]);

const adminAllowed=navigation.allowedViewsForRole('admin');
for(const auxiliary of ['suppliers','whatsapp','archives','settings'])assert.ok(adminAllowed.includes(auxiliary),`Master mantém acesso auxiliar a ${auxiliary}`);
assert.ok(!navigation.primaryNavigationForRole('admin').some(({id})=>['suppliers','whatsapp','archives','settings'].includes(id)),'funções auxiliares não são etapas principais');
assert.deepEqual(navigation.allowedViewsForRole('financeiro'),['budget','requests','execution'],'a fachada de permissões do Financeiro permanece compatível');

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
assert.equal(navigation.requestMatchesView({status:'execution',archived:null},'requests','financeiro'),true,'Financeiro mantém acompanhamento geral em Solicitação');
assert.equal(navigation.requestMatchesView({status:'execution',archived:{at:'2026-11-12'}},'execution','admin'),false,'arquivadas não permanecem nas filas ativas');
assert.equal(navigation.requestMatchesView({status:'execution',archived:{at:'2026-11-12'}},'archives','admin'),true,'arquivadas ficam na consulta auxiliar');

console.log('PASS: menu por perfil e filas exclusivas seguem as etapas do processo orçamentário.');
