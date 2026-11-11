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
assert.equal(isVisibleInEstimateView({status:'admin_review',estimate:{total:250}}),true,'estimativas concluídas continuam visíveis após seguirem para análise');
assert.equal(isVisibleInEstimateView({status:'quoting',estimate:{total:250}}),true,'a estimativa permanece consultável nas etapas posteriores');
assert.equal(isVisibleInEstimateView({status:'admin_review'}),false,'pedido sem pesquisa nem estimativa não aparece como resultado');

console.log('Estimate view: pending and completed estimates remain visible.');
