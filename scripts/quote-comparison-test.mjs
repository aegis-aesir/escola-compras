import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { budgetFixture } from './budget-fixture.mjs';

try {
  await build({ stdin: { contents: "export * from './app/quote-comparison';export * from './app/workflow';export { quotationMessage } from './app/model';export { requestedTotal } from './app/budget';", resolveDir: process.cwd() }, outfile: 'outputs/quote-comparison-test.mjs', platform: 'node', format: 'esm', bundle: true, logLevel: 'silent' });
} catch (error) { assert.fail(`Comparação estruturada ainda indisponível: ${error.message}`); }
const { transition, localExpired, quoteComparable, normalizeQuote, quotationMessage, requestedTotal } = await import('../outputs/quote-comparison-test.mjs');
const now = '2026-11-10T15:00:00Z';
const admin = { role: 'administrativo', name: 'Admin TESTE' };
const supplier = { id: '10000000-0000-4000-8000-000000000001', name: 'Fornecedor TESTE', category: 'Tecnologia', scope: 'local', phone: '5592999990000', contact: 'Contato teste', version: 1 };
const settings = { minQuotes: 1, holidays: [] };
function purchase(kind = 'digital') {
  const fixture = budgetFixture(kind);
  if (kind === 'digital') fixture.items = [{ ...fixture.items[0], quantity: 10 }];
  return { ...fixture, id: 'test', code: 'TESTE LOCAL', authorId: 'sector', authorName: 'Setor TESTE', version: 1, createdAt: now, updatedAt: now, status: 'quoting', generalApproval: { actor: 'DG TESTE', at: now, reason: 'Apenas necessidade' }, quotes: [], localDeadline: now };
}
const offer = (change = {}) => ({ supplierId: supplier.id, prices: [20], freight: 5, otherExpenses: 3, deliveryDays: 2, conditions: 'Condição fictícia de teste', validUntil: '2026-11-30', coverage: [10], comparable: true, currency: 'USD', priceBasis: 'cycle', exchangeRate: 5.1, exchangeDate: '2026-11-10', ...change });
const record = (r, input) => transition(r, { action: 'quote', data: input }, admin, [supplier], settings, now).data.quotes[0];
const select = (r, q, config = settings) => transition({ ...r, quotes: [q] }, { action: 'select', quoteId: q.id, reason: 'Escolha administrativa de teste' }, admin, [supplier], config, now);

test('novo formulário exige cobertura, comparabilidade, moeda e base declaradas', () => {
  const r = purchase();
  for (const key of ['coverage', 'comparable', 'currency', 'priceBasis']) {
    const data = offer(); delete data[key];
    assert.throws(() => record(r, data));
  }
  assert.equal(record(r, offer()).comparisonReady, true);
});

test('USD por licença e ciclo considera vigência, quantidade e despesas uma única vez', () => {
  const r = purchase();
  const q = record(r, offer());
  assert.equal(q.originalTotal, 2408); // 10 × USD20 × 12 + USD5 + USD3.
  assert.equal(q.total, 12280.8); // USD2408 × R$5,10.
  assert.equal(q.currency, 'USD');
  assert.equal(quoteComparable(q, r), true);
  assert.equal(select(r, q).data.status, 'execution');
  const term = record(r, offer({ prices: [240], priceBasis: 'term' }));
  assert.equal(term.originalTotal, 2408, 'Preço para a vigência inteira não multiplica ciclos novamente.');
  assert.equal(requestedTotal(r).total, 1198.8, 'Cotação real não substitui o valor preliminar do setor.');
});

test('cada assinatura mantém seus próprios ciclos e frete fica fora dos subtotais de item', () => {
  const r = purchase();
  r.items.push({ ...r.items[0], name: 'Segunda plataforma TESTE', quantity: 2, subscription: { ...r.items[0].subscription, cycles: 3 } });
  const q = record(r, offer({ prices: [20, 15], coverage: [10, 2] }));
  assert.equal(q.originalTotal, 2498); // 2400 + (2 × 15 × 3) + 5 + 3.
  assert.equal(q.total, 12739.8);
  assert.equal(quoteComparable(q, r), true);
});

test('moeda estrangeira sem câmbio conserva valor original e bloqueia seleção, pedido e cobertura local', () => {
  const r = purchase();
  const q = record(r, offer({ exchangeRate: undefined, exchangeDate: undefined, comparisonReady: true, total: 1 }));
  assert.equal(q.originalTotal, 2408);
  assert.equal(q.total, null);
  assert.equal(q.comparisonReady, false, 'Cliente não informa os totais ou a prontidão derivados.');
  assert.equal(quoteComparable(q, r), false);
  assert.throws(() => select(r, q));
  assert.equal(localExpired({ ...r, quotes: [q] }, now), true);
  assert.throws(() => transition({ ...r, status: 'execution', quotes: [q], selectedQuoteId: q.id }, { action: 'ordered', reason: 'Pedido indevido teste' }, admin, [supplier], settings, now));
  for (const change of [{ exchangeRate: 5, exchangeDate: undefined }, { exchangeRate: undefined, exchangeDate: '2026-11-10' }, { exchangeRate: 0 }, { exchangeDate: '2026-02-30' }]) assert.throws(() => record(r, offer(change)));
});

test('proposta parcial ou tecnicamente incomparável é registrada sem atender integralmente', () => {
  const r = purchase();
  for (const change of [{ coverage: [5] }, { coverage: [12] }, { comparable: false }]) {
    const q = record(r, offer(change));
    assert.equal(q.comparisonReady, false);
    assert.throws(() => select(r, q));
    assert.equal(localExpired({ ...r, quotes: [q] }, now), true);
  }
  const noItem = record(r, offer({ coverage: [0], prices: [0], freight: 0, otherExpenses: 0 }));
  assert.equal(noItem.originalTotal, 0);
  assert.equal(noItem.comparisonReady, false);
  for (const change of [{ coverage: [0], prices: [1] }, { coverage: [5], prices: [0] }, { coverage: [2.5] }, { coverage: [-1] }, { coverage: [] }, { coverage: [10, 10] }, { prices: [-1] }]) assert.throws(() => record(r, offer(change)));
});

test('quantidade mínima e menor preço consideram somente propostas integralmente comparáveis e válidas', () => {
  const r = purchase();
  const full = record(r, offer());
  const partial = { ...record(r, offer({ coverage: [1], prices: [1] })), id: 'partial' };
  assert.throws(() => transition({ ...r, quotes: [full, partial] }, { action: 'select', quoteId: full.id, reason: 'Escolher proposta integral' }, admin, [supplier], { ...settings, minQuotes: 2 }, now));
  const selected = transition({ ...r, quotes: [full, partial] }, { action: 'select', quoteId: full.id, reason: 'Escolher proposta integral' }, admin, [supplier], settings, now);
  assert.equal(selected.data.status, 'execution', 'Oferta parcial mais barata não exige justificativa de preço maior.');
  assert.equal(localExpired({ ...r, quotes: [full] }, now), false);
  const expired = { ...full, validUntil: '2026-11-09' };
  assert.equal(localExpired({ ...r, quotes: [expired] }, now), true);
  assert.throws(() => select(r, expired));
});

test('registros antigos sem formulário mantêm BRL e preço unitário de vigência integral', () => {
  const r = purchase('monthly'); delete r.form;
  const data = offer({ prices: [10], freight: 2, otherExpenses: 3 });
  for (const key of ['coverage', 'comparable', 'currency', 'priceBasis', 'exchangeRate', 'exchangeDate']) delete data[key];
  const q = record(r, data);
  assert.equal(q.total, 35); // Três resmas × R$10 + R$2 + R$3.
  assert.deepEqual(q.coverage, [3]);
  assert.equal(q.currency, 'BRL');
  assert.equal(q.priceBasis, 'term');
  assert.equal(quoteComparable({ validUntil: '2026-11-30' }), true);
  for (const total of [null, NaN, Infinity, -1]) assert.equal(quoteComparable({ total }), false);
  assert.equal(localExpired({ ...r, quotes: [{ validUntil: '2026-11-30' }] }, now), false);
  assert.equal(quoteComparable({ validUntil: '2026-11-30' }, purchase()), false, 'Novos formulários não aceitam proposta antiga sem metadados.');
  assert.throws(() => select(purchase(), { id: 'legacy', total: 1, validUntil: '2026-11-30' }));
});

test('estimativa digital manual é por licença para toda vigência e permanece separada do orçamento do setor', () => {
  const r = { ...purchase(), status: 'estimating' };
  const data = { references: [{ unitPrice: 240, sourceName: 'Fonte fictícia', sourceUrl: 'https://example.com/assinatura', researchedOn: '2026-11-10' }], freight: 0, notes: 'Preço em reais por licença para a vigência inteira.' };
  const estimated = transition(r, { action: 'estimate', data }, admin, [], settings, now).data;
  assert.equal(estimated.estimate.total, 2400);
  assert.equal(requestedTotal(estimated).total, 1198.8);
});

test('mensagem preparada informa plano, ciclo, vigência e ciclos sem enviar contato', () => {
  const r = purchase();
  const message = quotationMessage(r, supplier);
  assert.match(message, /Educacional fictício/);
  assert.match(message, /2026-12-01/);
  assert.match(message, /2027-11-30/);
  assert.match(message, /12 ciclo/);
  assert.match(message, /moeda/i);
  assert.match(message, /por licença/i);
  assert.match(message, /sem confirmação de compra/i);
});
