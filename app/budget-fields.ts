/** Descritores compartilhados pelo formulário e pela validação no servidor. */
export type BudgetKind = 'monthly' | 'emergency' | 'digital';
export type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'month' | 'datetime-local' | 'number' | 'checkbox';
  options?: string[];
  required?: boolean;
};
export type FieldSection = { title: string; fields: FieldDef[] };
const field = (key: string, label: string, type: FieldDef['type'] = 'text', required = false, options?: string[]): FieldDef => ({ key, label, type, ...(required ? { required } : {}), ...(options ? { options } : {}) });
const choice = (key: string, label: string, options: string[], required = false) => field(key, label, 'select', required, options);
const yesNo = ['Sim', 'Não'];
const reviewOptions = ['Sim', 'Não', 'N/A'];

const identification: FieldSection = { title: 'Identificação e planejamento', fields: [
  field('externalProtocol', 'Protocolo externo (opcional)'), field('originalRequestId', 'Pedido original / vínculo de complementação'),
  field('relatedRequestCode', 'Código da solicitação vinculada (ex.: solução provisória)'), field('correctionResponse', 'Resposta às pendências na complementação', 'textarea'),
  field('referenceMonth', 'Mês de referência', 'month', true), choice('situation', 'Situação', ['Nova', 'Complementação'], true),
  choice('origin', 'Origem', ['Planejada', 'Eventual'], true), field('responsible', 'Responsável pela solicitação', 'text', true),
  field('role', 'Cargo / função', 'text', true), field('contact', 'Contato / ramal', 'text', true), field('costCenter', 'Centro de custo / projeto'),
] };
const need: FieldSection = { title: 'Necessidade e classificação', fields: [
  field('deliveryLocation', 'Local de utilização / entrega', 'text', true), field('purpose', 'Finalidade', 'textarea', true),
  field('consequences', 'Consequências da não aprovação', 'textarea', true), field('expectedBenefits', 'Resultados / benefícios esperados', 'textarea', true),
  choice('requestPriority', 'Prioridade da necessidade', ['Essencial', 'Importante', 'Adiável'], true),
  choice('nature', 'Natureza', ['Recorrente', 'Eventual'], true), choice('budgetForecast', 'Previsão orçamentária', ['Prevista', 'Não prevista'], true),
  choice('requestType', 'Tipo', ['Compra', 'Serviço', 'Contratação', 'Manutenção', 'Evento', 'Outro'], true), field('requestTypeOther', 'Descreva o outro tipo'),
  choice('connection', 'Vínculo', ['Operacional', 'Pedagógico', 'Outro'], true), field('connectionOther', 'Descreva o outro vínculo'),
] };
const checks: FieldSection = { title: 'Verificações e documentos do setor', fields: [
  field('stockVerified', 'Conferi o estoque ou a disponibilidade existente', 'checkbox', true),
  field('duplicationVerified', 'Conferi a ausência de duplicidade do pedido', 'checkbox', true),
  field('quantityVerified', 'Conferi as quantidades solicitadas', 'checkbox', true),
  choice('documentsAvailable', 'Há documentos disponíveis?', yesNo, true), field('documentsReason', 'Justificativa da ausência de documentos', 'textarea'),
  field('indicatedSupplier', 'Fornecedor indicado pelo setor'), field('supplierReason', 'Justificativa da indicação', 'textarea'),
  field('noReferencesReason', 'Justificativa de ausência de referência preliminar', 'textarea'), field('requestNotes', 'Observações do setor', 'textarea'),
] };
const emergencySections: FieldSection[] = [
  { title: 'Ocorrência emergencial', fields: [
    field('occurrenceAt', 'Data e hora da ocorrência (Manaus)', 'datetime-local', true), field('occurrenceLocation', 'Local da ocorrência', 'text', true),
    field('occurrenceDescription', 'Descrição do fato', 'textarea', true), field('identifiedAt', 'Quando foi identificado (Manaus)', 'datetime-local', true),
    field('identificationMethod', 'Como foi identificado', 'textarea', true), field('affected', 'Pessoas, atividades ou estruturas afetadas', 'textarea', true),
  ] },
  { title: 'Riscos e impactos', fields: [
    field('riskSafety', 'Risco de segurança', 'checkbox'), field('riskStructural', 'Risco estrutural', 'checkbox'), field('riskElectrical', 'Risco elétrico', 'checkbox'),
    field('riskHydraulic', 'Risco hidráulico', 'checkbox'), field('riskOperational', 'Risco operacional', 'checkbox'), field('riskPedagogical', 'Risco pedagógico', 'checkbox'),
    field('riskTechnological', 'Risco tecnológico', 'checkbox'), choice('impact', 'Nível de impacto', ['Baixo', 'Médio', 'Alto', 'Crítico'], true),
    choice('interruption', 'Há interrupção?', ['Sim', 'Não', 'Parcial'], true), choice('peopleRisk', 'Há risco às pessoas?', yesNo, true),
    choice('propertyRisk', 'Há risco ao patrimônio?', yesNo, true), choice('immediateRisk', 'Há risco imediato?', yesNo, true),
    field('inactionConsequences', 'Consequências da inação', 'textarea', true), field('safeDeadline', 'Prazo máximo seguro para solução (Manaus)', 'datetime-local', true),
  ] },
  { title: 'Justificativa da emergência e solução', fields: [
    field('unpredictabilityReason', 'Por que a ocorrência era imprevisível?', 'textarea', true), field('cannotWaitReason', 'Por que não pode aguardar o ciclo mensal?', 'textarea', true),
    field('temporaryMeasures', 'Medidas provisórias adotadas (ou ausência justificada)', 'textarea', true), field('probableCause', 'Origem / causa provável', 'textarea', true),
    choice('planningFailure', 'Há indício de falha de planejamento / manutenção?', ['Sim', 'Não', 'A apurar'], true), field('planningFailureReason', 'Explique o indício de falha', 'textarea'),
    field('proposedIntervention', 'Intervenção proposta', 'textarea', true), field('interventionSpecifications', 'Especificações da intervenção', 'textarea', true),
    field('interventionResult', 'Resultado esperado da intervenção', 'textarea', true), field('executionDeadline', 'Prazo de execução proposto', 'date', true),
    field('linkedEmergencyId', 'Ocorrência / medida provisória vinculada (se houver)'),
    field('emergencyDeclaration', 'Declaro os fatos e a necessidade emergencial; atraso ou esquecimento não caracterizam emergência automaticamente', 'checkbox', true),
  ] },
];
const digitalSections: FieldSection[] = [
  { title: 'Objetivo e utilização das assinaturas', fields: [
    field('generalObjective', 'Objetivo geral das assinaturas', 'textarea', true), field('targetUsers', 'Usuários / setores atendidos', 'textarea', true),
    field('desiredActivation', 'Ativação / renovação desejada', 'date', true), choice('subscriptionMode', 'Modalidade', ['Nova', 'Renovação', 'Ampliação', 'Migração'], true),
    choice('usage', 'Uso', ['Administrativo', 'Pedagógico', 'Misto'], true), choice('personalData', 'Envolve dados pessoais?', yesNo, true),
    choice('integrations', 'Há integrações?', yesNo, true), field('integrationDetails', 'Integrações e compatibilidade necessárias', 'textarea'),
    field('personalDataDetails', 'Dados pessoais e cuidados declarados', 'textarea'), field('licenseManager', 'Gestor das licenças', 'text', true),
  ] },
  { title: 'Verificações específicas de assinaturas', fields: [
    choice('equivalentLicense', 'Existe solução / licença equivalente ativa?', ['Sim', 'Não', 'A verificar'], true), field('equivalentLicenseReason', 'Justificativa diante de licença equivalente ativa', 'textarea'),
    field('technicalVerified', 'Conferi requisitos técnicos, compatibilidade, licenças e vigência', 'checkbox', true),
    field('renewalVerified', 'Conferi reajuste, renovação automática e cancelamento', 'checkbox', true),
    choice('technicalValidation', 'Situação declarada da validação TI / Segurança', ['N/A', 'Pendente', 'Concluída'], true), field('technicalNotes', 'Informações de TI / privacidade declaradas pelo setor', 'textarea'),
  ] },
];

export const requestClassifications = ['Prevista recorrente', 'Prevista pontual', 'Não prevista recorrente', 'Não prevista pontual'];
const simplifiedIdentification: FieldSection = { title: 'Responsável pela solicitação', fields: [
  field('responsible', 'Responsável pela solicitação', 'text', true), field('role', 'Cargo / função', 'text', true),
] };
const simplifiedNeed: FieldSection = { ...need, fields: need.fields
  .filter(f => !['nature', 'budgetForecast', 'connection', 'connectionOther'].includes(f.key))
  .flatMap(f => f.key === 'requestPriority' ? [f, choice('classification', 'Classificação da necessidade', requestClassifications, true)] : [f]),
};
const simplifiedChecks: FieldSection = { ...checks, title: 'Verificações do setor', fields: checks.fields.filter(f => !['documentsAvailable', 'documentsReason', 'noReferencesReason'].includes(f.key)) };

/** Ausência de versão representa o formulário original, preservado para consulta e validação. */
export function requestSections(kind: BudgetKind, version?: 2): FieldSection[] {
  if (!['monthly', 'emergency', 'digital'].includes(kind)) throw new Error('Modelo de formulário inválido.');
  if (version === 2) return [simplifiedIdentification, simplifiedNeed,
    ...(kind === 'emergency' ? emergencySections.map(section => ({ ...section, fields: section.fields.filter(f => f.key !== 'linkedEmergencyId') })) : kind === 'digital' ? digitalSections : []),
    simplifiedChecks,
  ];
  return [identification, need, ...(kind === 'emergency' ? emergencySections : kind === 'digital' ? digitalSections : []), checks];
}

const review: FieldSection = { title: 'Conferência administrativa', fields: [
  ...[
    ['reviewComplete', 'Completude do formulário'], ['reviewNeed', 'Necessidade e finalidade'], ['reviewQuantity', 'Quantidades adequadas'],
    ['reviewStock', 'Estoque e disponibilidade'], ['reviewDuplication', 'Ausência de duplicidade'], ['reviewDocuments', 'Documentos suficientes'],
    ['reviewMarket', 'Compatibilidade com o mercado'], ['reviewPriority', 'Prioridade adequada'], ['reviewDeferral', 'Possibilidade de reduzir / adiar'],
    ['reviewSupplier', 'Fornecedor e condições informados'],
  ].map(([key, label]) => choice(key, label, reviewOptions)),
  field('reviewNotes', 'Pendências e esclarecimentos', 'textarea'), field('complementDeadline', 'Prazo para complementação', 'date'),
  field('reviewOwner', 'Responsável pela conferência'), field('reviewDate', 'Data da conferência', 'date'), field('reviewDeadline', 'Prazo da análise', 'date'),
] };
const opinion: FieldSection = { title: 'Parecer e escopo recomendado', fields: [
  choice('recommendation', 'Recomendação administrativa', ['Aprovar integralmente', 'Aprovar parcialmente', 'Complementar', 'Adiar', 'Rejeitar']),
  choice('validatedPriority', 'Prioridade validada', ['Essencial', 'Importante', 'Adiável']), field('recommendedScope', 'Itens, quantidades e escopo recomendado', 'textarea'),
  field('recommendedAmount', 'Valor recomendado informativo (R$)', 'number'), field('analysis', 'Análise administrativa', 'textarea'), field('opinionReason', 'Justificativa do parecer', 'textarea'),
  field('adjustments', 'Condições e ajustes recomendados', 'textarea'), field('opinionNotes', 'Observações do parecer', 'textarea'), field('opinionDeadline', 'Prazo de análise / validade do contexto', 'date'),
] };
const finance: FieldSection = { title: 'Avaliação financeira informativa', fields: [
  choice('financialAvailability', 'Disponibilidade', ['Integral', 'Parcial', 'Indisponível']), field('availableAmount', 'Valor disponível (R$)', 'number'),
  choice('cashImpact', 'Impacto no caixa', ['Baixo', 'Médio', 'Alto']), field('paymentPeriod', 'Período de pagamento'), field('paymentMethod', 'Forma de pagamento'),
  field('recommendedTerms', 'Condição recomendada', 'textarea'), field('financialAccount', 'Conta / centro de custo'), field('financialOwner', 'Responsável pela avaliação financeira'),
  field('financialDate', 'Data da avaliação financeira', 'date'), field('financialNotes', 'Observações financeiras', 'textarea'),
] };
const commercial: FieldSection = { title: 'Comparação e escolha comercial administrativa', fields: [
  choice('selectionCriterion', 'Critério da escolha', ['Menor preço', 'Melhor custo-benefício']), field('recommendedSupplier', 'Fornecedor recomendado'),
  field('selectionReason', 'Justificativa objetiva da escolha / preço maior', 'textarea'), field('selectionRisks', 'Riscos e ressalvas', 'textarea'),
  choice('quotationException', 'Exceção à quantidade configurada de propostas', ['Exclusividade', 'Continuidade', 'Padronização', 'Indisponibilidade', 'Emergência', 'Outro']),
  field('quotationExceptionReason', 'Justificativa da exceção', 'textarea'), field('quotationExceptionEvidence', 'Evidência da exceção', 'textarea'),
  ...[['assessmentPrice', 'Preço'], ['assessmentQuality', 'Qualidade / adequação'], ['assessmentDelivery', 'Prazo'], ['assessmentPayment', 'Pagamento'], ['assessmentSupport', 'Garantia / suporte'], ['assessmentHistory', 'Histórico / confiabilidade']]
    .map(([key, label]) => choice(key, `Avaliação: ${label}`, ['Favorável', 'Regular', 'Desfavorável'])),
] };
const execution: FieldSection = { title: 'Execução e prestação de contas', fields: [
  field('communicatedAt', 'Comunicação ao setor em', 'date'), field('communicatedBy', 'Responsável pela comunicação'), field('executionSupplier', 'Fornecedor utilizado'),
  field('contractedAmount', 'Valor contratado (R$)', 'number'), field('realizedAmount', 'Valor realizado (R$)', 'number'), field('contractedAt', 'Data da contratação / compra', 'date'),
  field('executionDate', 'Data da execução', 'date'), field('executionOwner', 'Responsável pela execução'), choice('executionStatus', 'Situação da execução', ['Pendente', 'Parcial', 'Concluída']),
  choice('receiptStatus', 'Recebimento / aceite', ['Pendente', 'Parcial', 'Recebido e aceito', 'N/A']), field('receiptDate', 'Data de recebimento / aceite', 'date'),
  field('receiptOwner', 'Responsável pela conferência / aceite'), field('receiptExceptionReason', 'Justificativa de recebimento N/A', 'textarea'),
  field('invoiceReference', 'NF / documento de execução'), field('financeForwardedAt', 'Encaminhamento ao financeiro em (Manaus)', 'datetime-local'),
  field('differenceReason', 'Justificativa das diferenças entre estimativa, contratado e realizado', 'textarea'), field('executionNotes', 'Observações de execução', 'textarea'),
] };
const followup: FieldSection = { title: 'Acompanhamento e retomada', fields: [
  field('nextOwner', 'Responsável pela próxima ação'), field('nextAction', 'Próxima ação / encaminhamento', 'textarea'), field('nextDeadline', 'Prazo da próxima ação', 'date'),
  field('referenceMonth', 'Competência proposta na retomada', 'month'), field('resumeReason', 'Justificativa de retomada / transferência de competência', 'textarea'),
] };
const emergencyManagement: FieldSection[] = [
  { title: 'Avaliação específica da emergência', fields: [
    choice('reviewUnpredictability', 'Imprevisibilidade comprovada', reviewOptions), choice('reviewDelayRisk', 'Risco do adiamento comprovado', reviewOptions),
    choice('reviewProportionality', 'Proporcionalidade da solução', reviewOptions), choice('reviewEmergencySupplier', 'Valor e fornecedor adequados', reviewOptions),
    choice('reviewCannotWait', 'Impossibilidade de aguardar o ciclo', reviewOptions), choice('validatedEmergency', 'Classificação emergencial validada', ['Sim', 'Não', 'Pendente']),
    field('temporaryScope', 'Escopo de medida provisória recomendada', 'textarea'), field('preventiveDetermination', 'Determinação preventiva / corretiva', 'textarea'),
  ] },
  { title: 'Análise posterior da emergência', fields: [
    field('emergencyAuthorizedAt', 'Data e hora da autorização da necessidade (Manaus)', 'datetime-local'), field('emergencyExecutedAt', 'Data e hora da execução (Manaus)', 'datetime-local'),
    field('emergencySupplierTaxId', 'CNPJ / CPF do fornecedor utilizado'), field('emergencyEvidence', 'Evidências / documentos da ocorrência e execução', 'textarea'),
    field('confirmedCause', 'Causa apurada posteriormente', 'textarea'), choice('couldPrevent', 'Era possível prevenir?', ['Sim', 'Não', 'A apurar']),
    field('preventiveAction', 'Ação preventiva / corretiva', 'textarea'), field('preventiveOwner', 'Responsável pela ação'), field('preventiveDeadline', 'Prazo da ação', 'date'),
  ] },
];
const digitalManagement: FieldSection[] = [
  { title: 'Conferência técnica e financeira das assinaturas', fields: [
    choice('reviewSubscriptions', 'Assinaturas individualizadas', reviewOptions), choice('reviewLicenses', 'Licenças e quantidades compatíveis', reviewOptions),
    choice('reviewActiveLicense', 'Licenças existentes verificadas', reviewOptions), choice('reviewPrivacy', 'TI / privacidade conferidas', reviewOptions),
    choice('reviewSubscriptionTerms', 'Ciclos, vigência, reajuste e renovação conferidos', reviewOptions), choice('reviewConsolidatedTotal', 'Total consolidado e conversão conferidos', reviewOptions),
    choice('technicalReview', 'Validação administrativa de TI / Segurança', ['N/A', 'Pendente', 'Concluída']), field('technicalReviewReason', 'Validação técnica / privacidade e justificativa de N/A', 'textarea'),
    field('technicalReviewer', 'Responsável técnico consultado'), field('technicalReviewDate', 'Data da validação técnica', 'date'),
    field('monthlyEquivalent', 'Valor mensal equivalente (R$)', 'number'), field('annualCommitment', 'Compromisso anual (R$)', 'number'),
    field('financialBasis', 'Base dos equivalentes financeiros e câmbio', 'textarea'), field('financialPeriod', 'Período dos equivalentes financeiros'),
  ] },
  { title: 'Contratação, ativação e renovação digital', fields: [
    choice('subscriptionStatus', 'Situação da assinatura', ['Contratada', 'Ativada', 'Renovada']), field('actualActivationDate', 'Ativação / renovação efetiva', 'date'),
    field('actualBillingCycle', 'Ciclo real de cobrança'), field('nextSubscriptionReview', 'Próxima revisão / cancelamento', 'date'),
    choice('licensesVerified', 'Acessos / licenças conferidos', ['Sim', 'Não', 'Pendente']), field('subscriptionConclusion', 'Conclusão sobre as assinaturas', 'textarea'),
  ] },
];

export type ManagementStage = {status:string;quotes:readonly unknown[];generalApproval?:unknown};
export const commercialFieldKeys = commercial.fields.map(f=>f.key);
export function canCompareCommercial(request:ManagementStage) {
  return !!request.generalApproval && request.quotes.length>0 && ['quoting','national','execution','ordered','received','approved'].includes(request.status);
}

/** Sem etapa, mantém o contrato de armazenamento dos registros anteriores. A interface sempre informa a etapa. */
export function managementSections(kind: BudgetKind, stage?:ManagementStage): FieldSection[] {
  if (!['monthly', 'emergency', 'digital'].includes(kind)) throw new Error('Modelo de formulário inválido.');
  const specific = kind === 'emergency' ? emergencyManagement : kind === 'digital' ? digitalManagement : [];
  const opinionSection = kind === 'emergency' ? { ...opinion, fields: opinion.fields.map(f => f.key === 'recommendation' ? { ...f, options: [...f.options!, 'Medida provisória'] } : f) } : opinion;
  const sections=[review, opinionSection, finance, ...specific, commercial, execution, followup];
  return stage?sections.filter(section=>section!==finance&&(section!==commercial||canCompareCommercial(stage))):sections;
}
