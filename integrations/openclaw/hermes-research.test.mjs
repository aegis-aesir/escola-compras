import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bridgeConfig, executeJob } from './client.mjs';

const baseEnv = { ESTRELAS_SITE_URL: 'http://localhost', ESTRELAS_LOCAL_TEST: 'true', INTEGRATION_SECRET: 'x'.repeat(32) };
const on = { ESTRELAS_RESEARCH_BACKEND: 'hermes', ESTRELAS_HERMES_SSH_HOST: '10.0.1.27' };
const item = { name: 'Papel A4', quantity: 2, unit: 'resma' };
const job = { id: 'fixture', type: 'estimate_search', item, query: 'papel', leaseToken: 'fixture-lease', freightSimulation: { cep: '69086-665', quantity: 2 } };
const url = 'https://example.test/papel';
const text = 'Papel A4. Uma resma de 500 folhas. R$ 29,90.';
const analysis = { status: 'verified', sourceUrl: url, productName: 'Papel A4', productQuote: 'Papel A4.', priceAmount: 29.9, currency: 'BRL', priceType: 'total', priceQuote: 'R$ 29,90.', packageQuantity: 1, unit: 'resma', unitQuote: 'Uma resma de 500 folhas.', itemMatches: true, unitMatches: true, reason: 'Produto e quantidade correspondem ao pedido.' };

test('Hermes recebe somente pesquisa, leitura e análise; o validador continua conferindo o preço literal', async () => {
  const config = bridgeConfig({ ...baseEnv, ...on });
  const gateway = () => assert.fail('gateway antigo não deveria receber a pesquisa');
  const calls = [];
  const run = async (_transport, body) => {
    calls.push(body);
    if (body.op === 'search') return { results: [{ url, title: 'Papel' }] };
    if (body.op === 'extract') return { title: 'Papel', text, truncated: false };
    return analysis;
  };
  const answer = await executeJob(config, job, gateway, undefined, run);
  assert.equal(answer.outcome, 'success');
  assert.equal(answer.priceEvidence.analysis.priceAmount, 29.9);
  assert.deepEqual(calls.map(x => x.op), ['search', 'extract', 'analyze']);
  assert.deepEqual(calls[2].freightSimulation, job.freightSimulation);
  const forged = await executeJob(config, job, gateway, undefined, async (...params) =>
    params[1].op === 'analyze' ? { ...analysis, priceAmount: 1 } : run(...params));
  assert.equal(forged.priceEvidence, undefined);
});

test('erro no Hermes não usa OpenClaw implicitamente; voltar a seleção restaura a rota', async () => {
  const gateway = async () => Response.json({ ok: true, result: { details: { results: [{ url }] } } });
  const failure = () => { throw new Error('offline'); };
  const request = { ...job, type: 'national_search' };
  assert.equal((await executeJob(bridgeConfig({ ...baseEnv, ...on }), request, gateway, undefined, failure)).outcome, 'error');
  assert.equal((await executeJob({ ...bridgeConfig(baseEnv), gatewayToken: 'fixture' }, request, gateway, undefined, failure)).outcome, 'success');
});

test('combinação incompatível e host não privado são recusados; envio segue bloqueado', async () => {
  assert.throws(() => bridgeConfig({ ...baseEnv, ...on, ESTRELAS_BROWSER_RESEARCH: 'true' }), /navegador/);
  assert.throws(() => bridgeConfig({ ...baseEnv, ...on, ESTRELAS_HERMES_SSH_HOST: '8.8.8.8' }), /privado/);
  await assert.rejects(executeJob(bridgeConfig({ ...baseEnv, ...on }), { ...job, type: 'whatsapp_quote' }, () => assert.fail(), undefined, () => assert.fail()), /bloqueado/);
});
