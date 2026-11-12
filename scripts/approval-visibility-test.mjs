import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';

await build({
  entryPoints:[path.resolve('app/request-views.ts')],
  outfile:'outputs/approval-visibility-test.mjs',
  bundle:true,
  platform:'node',
  format:'esm'
});

const {isVisibleInApprovalView}=await import('../outputs/approval-visibility-test.mjs?test='+Date.now());
const administrative={status:'admin_review'};
const general={status:'general_review'};

assert.equal(isVisibleInApprovalView(administrative,'administrativo'),true,'a Diretoria Administrativa recebe a etapa posterior à estimativa');
assert.equal(isVisibleInApprovalView(general,'administrativo'),true,'a Diretoria Administrativa mantém acesso ao pedido encaminhado para revisar sua análise');
assert.equal(isVisibleInApprovalView(administrative,'geral'),false,'a Diretoria Geral não vê pedidos sem aprovação administrativa');
assert.equal(isVisibleInApprovalView(general,'geral'),true,'a Diretoria Geral recebe pedidos aprovados administrativamente');
assert.equal(isVisibleInApprovalView(administrative,'admin'),true,'o Master acompanha a aprovação administrativa');
assert.equal(isVisibleInApprovalView(general,'admin'),true,'o Master acompanha a aprovação da DG');
assert.equal(isVisibleInApprovalView({status:'estimating'},'administrativo'),false,'pesquisa em andamento permanece no processo administrativo de estimativa');

console.log('Approval visibility: administrative and general queues are separated by role.');
