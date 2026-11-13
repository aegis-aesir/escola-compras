import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';

await build({
  entryPoints:[path.resolve('app/request-views.ts')],
  outfile:'outputs/estimate-view-test.mjs',
  bundle:true,
  platform:'node',
  format:'esm'
});

const {isVisibleInEstimateView}=await import('../outputs/estimate-view-test.mjs?test='+Date.now());

assert.equal(isVisibleInEstimateView({status:'estimating'}),true,'pedidos aguardando pesquisa aparecem em Estimativas');
assert.equal(isVisibleInEstimateView({status:'admin_review',estimate:{total:250}}),false,'pesquisa concluída retorna à Análise ADM');
assert.equal(isVisibleInEstimateView({status:'quoting',estimate:{total:250}}),false,'a estimativa deixa a fila quando o pedido avança para cotação');
assert.equal(isVisibleInEstimateView({status:'admin_review'}),false,'a conferência administrativa pertence à Análise ADM');
assert.equal(isVisibleInEstimateView({status:'pending'}),false,'pedido ainda não iniciado pertence à Análise ADM');

console.log('Estimate view: only active research remains in the Estimativa queue; administrative conference returns to Análise ADM.');
