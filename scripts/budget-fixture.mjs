/** Dados exclusivamente fictícios para testes locais; não importar no aplicativo. */
export function budgetFixture(kind = 'monthly') {
  const fields = {
    referenceMonth: '2026-12', situation: 'Nova', origin: 'Planejada', responsible: 'Responsável TESTE LOCAL', role: 'Coordenação de teste', contact: 'Ramal fictício 123',
    deliveryLocation: 'Almoxarifado TESTE LOCAL', purpose: 'Reposição de material para validação local', consequences: 'Atividades fictícias sem material', expectedBenefits: 'Continuidade das atividades de teste',
    requestPriority: 'Essencial', nature: 'Eventual', budgetForecast: 'Prevista', requestType: 'Compra', connection: 'Pedagógico',
    stockVerified: true, duplicationVerified: true, quantityVerified: true, documentsAvailable: 'Não', documentsReason: 'Não existem documentos adicionais para esta solicitação fictícia.',
  };
  let items = [{ name: 'Papel TESTE LOCAL', quantity: 3, unit: 'resma', spec: 'A4 fictício para testes', category: 'Papelaria', brand: 'Padrão fictício', estimatedUnitPrice: 10.15 }];
  if (kind === 'emergency') Object.assign(fields, {
    occurrenceAt: '2026-11-10T08:30', occurrenceLocation: 'Bloco TESTE LOCAL', occurrenceDescription: 'Vazamento fictício para validar formulário.',
    identifiedAt: '2026-11-10T08:35', identificationMethod: 'Inspeção de teste', affected: 'Atividades de teste', riskHydraulic: true,
    impact: 'Alto', interruption: 'Parcial', peopleRisk: 'Não', propertyRisk: 'Sim', immediateRisk: 'Sim', inactionConsequences: 'Danos fictícios às instalações',
    safeDeadline: '2026-11-10T18:00', unpredictabilityReason: 'Ruptura fictícia sem sinais prévios', cannotWaitReason: 'Teste de interrupção de abastecimento',
    temporaryMeasures: 'Registro fictício fechado', probableCause: 'Ruptura fictícia de conexão', planningFailure: 'Não', proposedIntervention: 'Trocar conexão fictícia',
    interventionSpecifications: 'Conexão de teste compatível', interventionResult: 'Restabelecer abastecimento fictício', executionDeadline: '2026-11-11',
    noReferencesReason: 'Ocorrência fictícia sem propostas ou contato real.', emergencyDeclaration: true,
  });
  if (kind === 'digital') {
    Object.assign(fields, {
      generalObjective: 'Apoio fictício à aprendizagem', targetUsers: 'Docentes TESTE LOCAL', desiredActivation: '2026-12-01', subscriptionMode: 'Nova', usage: 'Pedagógico',
      personalData: 'Não', integrations: 'Não', licenseManager: 'Gestor TESTE LOCAL', equivalentLicense: 'Não', technicalVerified: true, renewalVerified: true,
      technicalValidation: 'Pendente', noReferencesReason: 'Assinatura fictícia sem cotação ou contato real.',
    });
    items = [{ name: 'Plataforma TESTE LOCAL', quantity: 2, unit: 'licença', category: 'Tecnologia', spec: 'Acesso fictício para teste', subscription: {
      plan: 'Educacional fictício', cycle: 'Mensal', start: '2026-12-01', end: '2027-11-30', cycles: 12, currency: 'BRL', pricePerCycle: 9.99,
    } }];
  }
  return {
    title: `TESTE LOCAL orçamento ${kind}`, department: 'Pedagógico', priority: 'Essencial', neededBy: '2026-12-01', reason: 'Validação local dos campos estruturados; nenhum contato real.',
    items, form: { kind, fields, references: [], accepted: true },
  };
}

export function simplifiedBudgetFixture(kind = 'monthly') {
  const value = budgetFixture(kind);
  const removed = ['externalProtocol', 'originalRequestId', 'relatedRequestCode', 'correctionResponse', 'referenceMonth', 'situation', 'contact', 'costCenter', 'connection', 'connectionOther', 'documentsAvailable', 'documentsReason', 'noReferencesReason', 'origin', 'nature', 'budgetForecast', 'linkedEmergencyId'];
  for (const key of removed) delete value.form.fields[key];
  value.form.version = 2;
  value.form.fields.classification = 'Prevista pontual';
  return value;
}
