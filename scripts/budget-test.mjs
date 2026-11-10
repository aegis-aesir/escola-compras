import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { budgetFixture } from './budget-fixture.mjs';

try {
  await build({ entryPoints: ['app/budget.ts'], outfile: 'outputs/budget-test-bundle.mjs', platform: 'node', format: 'esm', bundle: true, logLevel: 'silent' });
} catch (error) {
  assert.fail(`Domínio dos formulários ainda indisponível: ${error.message}`);
}
const { parseBudgetForm, parseManagement, requestedTotal, subscriptionTotal, monthlyCalendar, budgetMonth, requestSections, managementSections } = await import('../outputs/budget-test-bundle.mjs');
const items = [{ name: 'Papel', quantity: 3, unit: 'resma', spec: 'A4', brand: 'Padrão solicitado', estimatedUnitPrice: 10.15 }];
const common = {
  referenceMonth: '2026-12', situation: 'Nova', origin: 'Planejada', responsible: 'Responsável do setor', role: 'Coordenação', contact: 'ramal 12',
  purpose: 'Reposição para as atividades', consequences: 'Atividades sem material', expectedBenefits: 'Continuidade das aulas', deliveryLocation: 'Almoxarifado',
  requestPriority: 'Essencial', nature: 'Eventual', budgetForecast: 'Prevista', requestType: 'Compra', connection: 'Pedagógico',
  stockVerified: true, duplicationVerified: true, quantityVerified: true, documentsAvailable: 'Não', documentsReason: 'Não há documento adicional para este material.',
};
const monthly = () => ({ kind: 'monthly', fields: { ...common }, references: [], accepted: true });
const emergency = () => ({ kind: 'emergency', fields: { ...common, occurrenceAt: '2026-11-10T08:30', occurrenceLocation: 'Bloco A', occurrenceDescription: 'Vazamento interrompe abastecimento.', identifiedAt: '2026-11-10T08:35', identificationMethod: 'Inspeção presencial', affected: 'Cozinha e banheiros', riskHydraulic: true, impact: 'Alto', interruption: 'Parcial', peopleRisk: 'Não', propertyRisk: 'Sim', immediateRisk: 'Sim', inactionConsequences: 'Danos às instalações', safeDeadline: '2026-11-10T18:00', unpredictabilityReason: 'Ruptura oculta sem sinal prévio', cannotWaitReason: 'Escola sem abastecimento', temporaryMeasures: 'Registro fechado', probableCause: 'Ruptura da conexão', planningFailure: 'Não', proposedIntervention: 'Trocar a conexão', interventionSpecifications: 'Conexão compatível', interventionResult: 'Restabelecer abastecimento', executionDeadline: '2026-11-11', noReferencesReason: 'Ocorrência recente sem proposta disponível', emergencyDeclaration: true }, references: [], accepted: true });
const subscription = { plan: 'Educacional', cycle: 'Mensal', start: '2026-12-01', end: '2027-11-30', cycles: 12, currency: 'USD', pricePerCycle: 9.99 };
const digitalItems = [{ name: 'Plataforma de ensino', quantity: 2, unit: 'licença', spec: 'Acesso web', subscription }];
const digital = () => ({ kind: 'digital', fields: { ...common, generalObjective: 'Apoiar aprendizagem', targetUsers: 'Docentes', desiredActivation: '2026-12-01', subscriptionMode: 'Nova', usage: 'Pedagógico', personalData: 'Sim', integrations: 'Não', licenseManager: 'Coordenação', equivalentLicense: 'Não', technicalVerified: true, renewalVerified: true, technicalValidation: 'Pendente', noReferencesReason: 'Fornecedor ainda não forneceu proposta.' }, references: [], accepted: true });

test('solicitação mensal preserva declarações explícitas e separa os valores do setor', () => {
  const parsed = parseBudgetForm(monthly(), items);
  assert.equal(parsed.accepted, true);
  assert.equal(parsed.fields.documentsAvailable, 'Não');
  assert.equal(parsed.fields.referenceMonth, '2026-12');
  assert.equal(requestedTotal({ form: parsed, items }).total, 30.45);
  assert.equal(requestedTotal({ form: parsed, items, estimate: { total: 900 } }).total, 30.45);
});
test('campos extras e valores administrativos nunca atravessam o formulário do setor', () => {
  assert.throws(() => parseBudgetForm({ ...monthly(), management: { recommendedAmount: 1 } }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, recommendedAmount: 1 } }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, occurrenceAt: '2026-11-10T08:30' } }, items));
});
test('datas reais, limites e declaração autenticada são obrigatórios', () => {
  assert.throws(() => parseBudgetForm({ ...monthly(), accepted: false }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), accepted: 'true' }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, referenceMonth: '2026-13' } }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, contact: 'a'.repeat(6001) } }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, stockVerified: 'true' } }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, quantityVerified: false } }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, documentsReason: '' } }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), fields: { ...common, situation: 'Complementação' } }, items));
  assert.throws(() => parseBudgetForm(monthly(), [{ ...items[0], brand: 'a'.repeat(161) }]));
  assert.throws(() => parseBudgetForm(monthly(), [{ ...items[0], estimatedUnitPrice: Infinity }]));
  assert.throws(() => parseBudgetForm(monthly(), [{ ...items[0], estimatedUnitPrice: -1 }]));
  assert.throws(() => parseBudgetForm(monthly(), [{ ...items[0], subscription }]));
});
test('referências preliminares vinculam item e não autorizam URL ativa ou item inexistente', () => {
  const reference = { itemIndex: 0, supplier: 'Fornecedor informado', condition: 'À vista', currency: 'BRL', amount: 9.95, reference: 'https://example.com/papel', validUntil: '2026-12-10' };
  assert.equal(parseBudgetForm({ ...monthly(), references: [reference] }, items).references[0].amount, 9.95);
  for (const change of [{ itemIndex: 1 }, { itemIndex: -1 }, { reference: 'javascript:alert(1)' }, { validUntil: '2026-02-30' }, { amount: -1 }, { amount: Infinity }, { supplierId: 'oficial' }]) {
    assert.throws(() => parseBudgetForm({ ...monthly(), references: [{ ...reference, ...change }] }, items));
  }
  assert.throws(() => parseBudgetForm({ ...monthly(), references: Array(101).fill(reference) }, items));
  assert.throws(() => parseBudgetForm({ ...monthly(), references: [{ ...reference, reference: 'https://' }] }, items));
});
test('preços declarados são arredondados em centavos e o solicitado preserva o escopo original', () => {
  const reference = { itemIndex: 0, supplier: 'Fornecedor informado', currency: 'BRL', amount: 10.155, reference: 'Proposta preliminar não oficial' };
  assert.equal(parseBudgetForm({ ...monthly(), references: [reference] }, items).references[0].amount, 10.16);
  const parsed = parseBudgetForm(digital(), [{ ...digitalItems[0], subscription: { ...subscription, currency: 'BRL', pricePerCycle: 1.005 } }]);
  assert.equal(requestedTotal({ form: parsed, items: [{ ...digitalItems[0], subscription: { ...subscription, currency: 'BRL', pricePerCycle: 1.005 } }] }).total, 24.24);
  assert.equal(requestedTotal({ form: monthly(), items: [{ quantity: 1, estimatedUnitPrice: 1 }], originalScope: { form: monthly(), items } }).total, 30.45);
  assert.equal(requestedTotal({ items: [{ quantity: 3, estimatedUnitPrice: 10.075 }] }).total, 30.24);
});
test('emergência exige risco, imprevisibilidade e declaração específica, sem autorizar compra', () => {
  assert.equal(parseBudgetForm(emergency(), items).fields.riskHydraulic, true);
  for (const change of [{ emergencyDeclaration: false }, { riskHydraulic: false }, { unpredictabilityReason: '' }, { occurrenceAt: '2026-02-30T08:30' }, { planningFailure: 'Sim' }]) {
    assert.throws(() => parseBudgetForm({ ...emergency(), fields: { ...emergency().fields, ...change } }, items));
  }
});
test('assinaturas usam preço por licença e ciclos; câmbio ausente permanece incompleto', () => {
  assert.equal(parseBudgetForm(digital(), digitalItems).kind, 'digital');
  assert.deepEqual(subscriptionTotal(digitalItems[0]), { total: null, complete: false, currency: 'USD', originalTotal: 239.76 });
  assert.equal(subscriptionTotal({ ...digitalItems[0], subscription: { ...subscription, exchangeRate: 5.1, exchangeDate: '2026-11-10' } }).total, 1222.78);
  assert.equal(requestedTotal({ form: digital(), items: digitalItems }).total, null);
  assert.equal(requestedTotal({ form: digital(), items: digitalItems }).complete, false);
  assert.equal(requestedTotal({ items: [{ quantity: 2, estimatedUnitPrice: 0.1 }, { quantity: 1, estimatedUnitPrice: 0.2 }] }).total, 0.4);
  assert.equal(requestedTotal({ items: [{ quantity: 2 }] }).total, null);
  assert.deepEqual(requestedTotal({ items: [] }), { total: null, complete: false, missingItems: [] });
  for (const change of [{ cycles: 0 }, { end: '2026-01-01' }, { exchangeRate: 5 }, { currency: 'XXX' }, { pricePerCycle: -1 }, { cycle: 'semanal' }]) {
    assert.throws(() => parseBudgetForm(digital(), [{ ...digitalItems[0], subscription: { ...subscription, ...change } }]));
  }
  assert.throws(() => parseBudgetForm(digital(), [{ ...digitalItems[0], quantity: 1.5 }]));
  assert.throws(() => parseBudgetForm({ ...digital(), fields: { ...digital().fields, noReferencesReason: '' } }, digitalItems));
});
test('progresso administrativo admite incompletude mas rejeita campos alheios e números inválidos', () => {
  assert.deepEqual(parseManagement({ recommendedAmount: 0, nextOwner: 'Administração' }, 'monthly'), { recommendedAmount: 0, nextOwner: 'Administração' });
  assert.deepEqual(parseManagement({ technicalReview: 'Pendente' }, 'digital'), { technicalReview: 'Pendente' });
  assert.deepEqual(parseManagement({ receiptStatus: 'N/A' }, 'monthly'), { receiptStatus: 'N/A' });
  for (const input of [{ approvedAmount: 100 }, { recommendedAmount: -1 }, { realizedAmount: NaN }, { executionDate: '2026-02-30' }, { technicalReview: 'Concluída' }]) {
    assert.throws(() => parseManagement(input, 'monthly'));
  }
});
test('competência é explícita e transferência não depende da data da máquina', () => {
  assert.equal(budgetMonth({ form: monthly(), management: { referenceMonth: '2027-01' } }), '2027-01');
  assert.equal(budgetMonth({ form: monthly() }), '2026-12');
  assert.equal(budgetMonth({ createdAt: '2026-11-10T12:00:00Z' }), null);
});
test('calendário antecipa prazo fixo e calcula quinto dia útil através da virada do ano', () => {
  const calendar = monthlyCalendar('2027-01', ['2026-12-25', '2027-02-01']);
  assert.equal(calendar.submission, '2026-12-15');
  assert.equal(calendar.review, '2026-12-18');
  assert.equal(calendar.complement, '2026-12-18');
  assert.equal(calendar.decision, '2026-12-24');
  assert.equal(calendar.communication, '2026-12-24');
  assert.equal(calendar.execution, '2027-01-01');
  assert.equal(calendar.report, '2027-02-08');
  assert.throws(() => monthlyCalendar('2027-13'));
  assert.throws(() => monthlyCalendar('2027-01', ['2027-02-30']));
});
test('descritores oferecem formulários distintos sem expor conferência administrativa aos setores', () => {
  const sectorKeys = requestSections('monthly').flatMap(section => section.fields.map(field => field.key));
  assert.ok(sectorKeys.includes('referenceMonth'));
  assert.ok(!sectorKeys.includes('recommendedAmount'));
  const emergencyKeys = requestSections('emergency').flatMap(section => section.fields.map(field => field.key));
  assert.ok(emergencyKeys.includes('safeDeadline'));
  const managementKeys = managementSections('digital').flatMap(section => section.fields.map(field => field.key));
  assert.ok(managementKeys.includes('technicalReview'));
  assert.ok(managementKeys.includes('realizedAmount'));
});
test('fixtures compartilhadas enviam todos os campos condicionais dos três modelos', () => {
  for (const kind of ['monthly', 'emergency', 'digital']) {
    const fixture = budgetFixture(kind);
    assert.equal(parseBudgetForm(fixture.form, fixture.items).kind, kind);
  }
});
