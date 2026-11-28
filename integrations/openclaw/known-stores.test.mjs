import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bridgeConfig, executeJob } from './client.mjs';
import { knownStores, prioritizeKnownStores, DEFAULT_KNOWN_STORES } from './search-utils.mjs';

const baseEnv = { ESTRELAS_SITE_URL: 'http://localhost', ESTRELAS_LOCAL_TEST: 'true', INTEGRATION_SECRET: 'x'.repeat(32), ESTRELAS_RESEARCH_BACKEND: 'hermes', ESTRELAS_HERMES_SSH_HOST: '10.0.1.27' };
const item = { name: 'Papel A4', quantity: 2, unit: 'resma' };
const job = { id: 'fixture', type: 'estimate_search', item, query: 'papel', leaseToken: 'fixture-lease', freightSimulation: { cep: '69086-665', quantity: 2 } };
const mixed = ['https://loja-desconhecida.test/a', 'https://blog.test/b', 'https://www.kabum.com.br/p', 'https://outra.test/c', 'https://produto.mercadolivre.com.br/MLB-1'];

async function fetchedUrls(env, urls) {
  const fetched = [];
  const run = async (_t, body) => {
    if (body.op === 'search') return { results: urls.map(url => ({ url, title: 'Papel' })) };
    if (body.op === 'extract') { fetched.push(body.url); return { title: 'Papel', text: 'Papel A4', truncated: false }; }
    return { status: 'needs_review', reason: 'fixture' };
  };
  await executeJob(bridgeConfig({ ...baseEnv, ...env }), job, () => assert.fail('gateway'), undefined, run);
  return fetched;
}

test('resultados misturados: lojas conhecidas são analisadas primeiro', async () => {
  assert.deepEqual(await fetchedUrls({}, mixed), ['https://produto.mercadolivre.com.br/MLB-1', 'https://www.kabum.com.br/p', 'https://loja-desconhecida.test/a']);
});

test('sem loja conhecida, a ordem da busca permanece', async () => {
  const urls = ['https://a.test/1', 'https://b.test/2', 'https://c.test/3', 'https://d.test/4'];
  assert.deepEqual(await fetchedUrls({}, urls), urls.slice(0, 3));
});

test('lista configurável pelo ambiente, sem mudar código', async () => {
  assert.deepEqual(await fetchedUrls({ ESTRELAS_KNOWN_STORES: 'outra.test, www.blog.test' }, mixed), ['https://outra.test/c', 'https://blog.test/b', 'https://loja-desconhecida.test/a']);
  assert.deepEqual(await fetchedUrls({ ESTRELAS_KNOWN_STORES: 'none' }, mixed), mixed.slice(0, 3));
  assert.deepEqual(knownStores(undefined), DEFAULT_KNOWN_STORES);
  assert.deepEqual(knownStores('exemplo, http://x, kabum.com.br'), ['kabum.com.br']);
});

test('domínio parecido não conta como loja conhecida', () => {
  const sources = [{ url: 'https://a.test' }, { url: 'https://falsokabum.com.br/x' }, { url: 'https://kabum.com.br.golpe.test/x' }, { url: 'nao-e-url' }];
  assert.deepEqual(prioritizeKnownStores(sources, DEFAULT_KNOWN_STORES), sources);
});
