import { z } from 'zod';
import { requestSections, managementSections, type BudgetKind, type FieldDef } from './budget-fields';
export { requestSections, managementSections } from './budget-fields';
export type { BudgetKind, FieldDef, FieldSection } from './budget-fields';

export type FieldValue = string | number | boolean;
export type PreliminaryReference = {
  /** Índice do item, começando em zero. Não é fornecedor nem proposta oficial. */
  itemIndex: number;
  supplier: string;
  condition?: string;
  currency: string;
  amount?: number;
  deadline?: string;
  validUntil?: string;
  reference: string;
};
export type BudgetForm = { version?: 2; kind: BudgetKind; fields: Record<string, FieldValue>; references: PreliminaryReference[]; accepted: boolean };
export type ManagementData = Record<string, FieldValue>;
export type BudgetManagement = ManagementData;
const MAX_UNIT_AMOUNT = 10_000_000;
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const validMonth = (value: string) => /^(19\d{2}|20\d{2}|21\d{2}|2200)-(0[1-9]|1[0-2])$/.test(value);
const dateSchema = z.string().refine(validDate, 'Data inválida.');
const validLocalTime = (value: string) => {
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
  return !!match && validDate(match[1]);
};
/** Arredondamento decimal em centavos, inclusive valores como 1,005 e 10,075. */
export function roundMoney(amount: number): number {
  const [coefficient, exponent = '0'] = String(amount).split('e');
  return Number(`${Math.round(Number(`${coefficient}e${Number(exponent) + 2}`))}e-2`);
}
export const budgetAmountSchema = z.number().finite().nonnegative().max(MAX_UNIT_AMOUNT).transform(roundMoney);
const finiteMoney = budgetAmountSchema;
export const subscriptionSchema = z.object({
  plan: z.string().trim().min(1).max(200), cycle: z.enum(['Mensal', 'Anual', 'Outro']),
  start: dateSchema, end: dateSchema, cycles: z.number().int().positive().max(1200), currency: z.enum(['BRL', 'USD', 'EUR', 'Outra']),
  pricePerCycle: finiteMoney, exchangeRate: z.number().finite().positive().max(1_000_000).optional(), exchangeDate: dateSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.end < value.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'O fim da vigência deve ser igual ou posterior ao início.' });
  if ((value.exchangeRate !== undefined) !== (value.exchangeDate !== undefined)) ctx.addIssue({ code: 'custom', path: ['exchangeDate'], message: 'Informe a taxa e a data/base do câmbio juntas.' });
});
export type Subscription = z.infer<typeof subscriptionSchema>;

const referenceSchema = z.object({
  itemIndex: z.number().int().nonnegative().max(49), supplier: z.string().trim().min(2).max(200),
  condition: z.string().trim().max(2000).optional(), currency: z.string().trim().min(3).max(20), amount: finiteMoney.optional(),
  deadline: z.string().trim().max(300).optional(), validUntil: dateSchema.optional(),
  reference: z.string().trim().min(2).max(2000).refine(value => {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return true;
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !!url.hostname; } catch { return false; }
  }, 'Links devem usar uma URL HTTP ou HTTPS válida.'),
}).strict();
const formSchema = z.object({
  version: z.literal(2).optional(),
  kind: z.enum(['monthly', 'emergency', 'digital']), fields: z.record(z.union([z.string(), z.number().finite(), z.boolean()])),
  references: z.array(referenceSchema).max(100), accepted: z.literal(true),
}).strict();
const invalid = (message: string): never => { throw Object.assign(new Error(message), { status: 400 }); };
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  return invalid(result.error.issues.map(issue => `${issue.path.join('.') || 'Dados'}: ${issue.message}`).join(' '));
}
function parseFields(input: unknown, definitions: FieldDef[], required: boolean): Record<string, FieldValue> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Informe os campos do formulário.');
  const entries = Object.entries(input as Record<string, unknown>);
  const allowed = new Map(definitions.map(definition => [definition.key, definition]));
  for (const [key] of entries) if (!allowed.has(key)) invalid(`Campo não permitido: ${key}.`);
  const output: Record<string, FieldValue> = {};
  for (const definition of definitions) {
    let value = (input as Record<string, unknown>)[definition.key];
    if (typeof value === 'string') value = value.trim();
    if (value === undefined || value === '') {
      if (required && definition.required) invalid(`Preencha: ${definition.label}.`);
      continue;
    }
    const fail = () => invalid(`Valor inválido: ${definition.label}.`);
    if (definition.type === 'checkbox') {
      if (typeof value !== 'boolean' || (required && definition.required && !value)) fail();
    } else if (definition.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) fail();
      value = rounded(value as number);
    } else {
      if (typeof value !== 'string') fail();
      const text = value as string;
      if (text.length > (definition.type === 'textarea' ? 6000 : 500)) fail();
      if (definition.type === 'select' && !definition.options?.includes(text)) fail();
      if (definition.type === 'date' && !validDate(text)) fail();
      if (definition.type === 'month' && !validMonth(text)) fail();
      if (definition.type === 'datetime-local' && !validLocalTime(text)) fail();
    }
    output[definition.key] = value as FieldValue;
  }
  return output;
}

/** Estrutural para evitar ciclos com model.ts e preservar pedidos antigos. */
type BudgetItem = {
  quantity: number;
  brand?: string;
  estimatedUnitPrice?: number;
  subscription?: Subscription;
};
type BudgetPurchase = {
  items: BudgetItem[];
  form?: BudgetForm;
  management?: ManagementData;
  originalScope?: { items: BudgetItem[]; form?: BudgetForm };
};

/** Envio do setor: valida integralmente o modelo novo e rejeita campos administrativos. */
export type BudgetSubmission = { at: string; previous?: BudgetForm; createdAt?: string; requestCode?: string };
/** A competência nova usa a data do primeiro envio em Manaus, nunca a data necessária. */
export function submissionMonth(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) invalid('Data de envio inválida.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
export function parseBudgetForm(input: unknown, items: BudgetItem[], submission?: BudgetSubmission): BudgetForm {
  const base = parse(formSchema, input);
  const editable = { ...base.fields };
  if (base.version === 2) {
    for (const key of ['referenceMonth', 'originalRequestId', 'situation']) delete editable[key];
  }
  const definitions = requestSections(base.kind, base.version).flatMap(section => section.fields);
  if (base.version === 2) definitions.push({ key: 'correctionResponse', label: 'Resposta às pendências', type: 'textarea' });
  const fields = parseFields(editable, definitions, true);
  if (base.version === 2 && !submission) return invalid('A data de envio deve ser registrada pelo servidor.');
  if (submission) {
    const previousMonth = submission.previous?.fields.referenceMonth;
    fields.referenceMonth = typeof previousMonth === 'string' && validMonth(previousMonth) ? previousMonth : submissionMonth(submission.createdAt || submission.at);
    fields.situation = submission.requestCode ? 'Complementação' : 'Nova';
    delete fields.originalRequestId;
    if (submission.requestCode) fields.originalRequestId = submission.requestCode;
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) invalid('Informe de 1 a 50 itens.');
  for (const item of items) {
    if (!item || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 100000) invalid('Quantidade de item inválida.');
    if (item.brand !== undefined && (typeof item.brand !== 'string' || item.brand.length > 160)) invalid('Marca / padrão deve ter até 160 caracteres.');
    if (item.estimatedUnitPrice !== undefined) parse(finiteMoney, item.estimatedUnitPrice);
    if (base.kind === 'digital') {
      if (!Number.isInteger(item.quantity)) invalid('Informe uma quantidade inteira de usuários / licenças.');
      const subscription = parse(subscriptionSchema, item.subscription);
      if (subscriptionTotal({ ...item, subscription }).originalTotal === null) invalid('Total da vigência excede o limite de cálculo seguro.');
    } else if (item.subscription !== undefined) invalid('Assinaturas só podem ser informadas no formulário digital.');
  }
  for (const reference of base.references) {
    if (reference.itemIndex >= items.length) invalid('Referência preliminar vinculada a item inexistente.');
  }
  const requireDetail = (condition: boolean, key: string, message: string) => { if (condition && !fields[key]) invalid(message); };
  requireDetail(fields.documentsAvailable === 'Não', 'documentsReason', 'Justifique a ausência de documentos.');
  requireDetail(fields.situation === 'Complementação', 'originalRequestId', 'Identifique o pedido original da complementação.');
  requireDetail(fields.requestType === 'Outro', 'requestTypeOther', 'Descreva o outro tipo de solicitação.');
  requireDetail(fields.connection === 'Outro', 'connectionOther', 'Descreva o outro vínculo.');
  requireDetail(!!fields.indicatedSupplier, 'supplierReason', 'Justifique a indicação de fornecedor.');
  if (fields.correctionResponse && String(fields.correctionResponse).length < 5) invalid('Descreva a resposta à complementação com pelo menos cinco caracteres.');
  if (base.kind === 'emergency') {
    const risks = ['riskSafety', 'riskStructural', 'riskElectrical', 'riskHydraulic', 'riskOperational', 'riskPedagogical', 'riskTechnological'];
    if (!risks.some(key => fields[key] === true)) invalid('Indique ao menos uma natureza de risco da emergência.');
    requireDetail(fields.planningFailure === 'Sim', 'planningFailureReason', 'Explique o indício de falha de planejamento / manutenção.');
    requireDetail(base.version !== 2 && base.references.length === 0, 'noReferencesReason', 'Justifique a ausência de referência preliminar na emergência.');
    if (String(fields.safeDeadline) < String(fields.occurrenceAt)) invalid('O prazo seguro não pode anteceder a ocorrência.');
  }
  if (base.kind === 'digital') {
    requireDetail(fields.integrations === 'Sim', 'integrationDetails', 'Descreva as integrações necessárias.');
    requireDetail(fields.equivalentLicense === 'Sim', 'equivalentLicenseReason', 'Justifique a solicitação diante da licença equivalente ativa.');
    requireDetail(base.version !== 2 && items.some((_, index) => !base.references.some(reference => reference.itemIndex === index)), 'noReferencesReason', 'Informe uma referência para cada assinatura ou justifique a ausência.');
  }
  return { ...(base.version === 2 ? { version: 2 as const } : {}), kind: base.kind, fields, references: base.references, accepted: true };
}

/** Salvar progresso não equivale a emitir parecer nem a liberar execução/pagamento. */
export function parseManagement(input: unknown, kind: BudgetKind): ManagementData {
  return parseFields(input, managementSections(kind).flatMap(section => section.fields), false);
}

const rounded = roundMoney;
const isPositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
export type SubscriptionTotal = { total: number | null; complete: boolean; currency: string; originalTotal: number | null };
/** Preço por licença por ciclo. Nunca presume câmbio ou quantidade de ciclos pela data. */
export function subscriptionTotal(item: BudgetItem): SubscriptionTotal {
  const parsed = subscriptionSchema.safeParse(item.subscription);
  const currency = typeof item.subscription?.currency === 'string' ? item.subscription.currency : 'BRL';
  const missing: SubscriptionTotal = { total: null, complete: false, currency, originalTotal: null };
  if (!parsed.success || !isPositive(item.quantity) || !Number.isInteger(item.quantity)) return missing;
  const value = parsed.data;
  const originalCents = Math.round((value.pricePerCycle + Number.EPSILON) * 100) * item.quantity * value.cycles;
  if (!Number.isSafeInteger(originalCents)) return missing;
  const originalTotal = originalCents / 100;
  if (value.currency !== 'BRL' && (!value.exchangeRate || !value.exchangeDate)) return { ...missing, originalTotal };
  const convertedCents = value.currency === 'BRL' ? originalCents : Math.round(originalCents * value.exchangeRate!);
  if (!Number.isSafeInteger(convertedCents)) return { ...missing, originalTotal };
  return { total: convertedCents / 100, complete: true, currency: value.currency, originalTotal };
}
export type RequestedTotal = { total: number | null; complete: boolean; missingItems: number[] };
/** O total histórico solicitado usa o escopo original de pedidos aprovados parcialmente. */
export function requestedTotal(purchase: BudgetPurchase): RequestedTotal {
  const source = purchase.originalScope ?? purchase;
  const items = source.items ?? [];
  const missingItems: number[] = [];
  let totalCents = 0;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    let amount: number | null = null;
    if (source.form?.kind === 'digital' || item.subscription) amount = subscriptionTotal(item).total;
    else if (isPositive(item.quantity) && typeof item.estimatedUnitPrice === 'number' && Number.isFinite(item.estimatedUnitPrice) && item.estimatedUnitPrice >= 0) {
      const cents = Math.round(Math.round(roundMoney(item.estimatedUnitPrice) * 100) * item.quantity);
      if (Number.isSafeInteger(cents)) amount = cents / 100;
    }
    if (amount === null) missingItems.push(index);
    else totalCents += Math.round(amount * 100);
  }
  const complete = items.length > 0 && missingItems.length === 0 && Number.isSafeInteger(totalCents);
  return { total: complete ? totalCents / 100 : null, complete, missingItems };
}

export function budgetMonth(purchase: { form?: BudgetForm; management?: ManagementData }): string | null {
  const transferred = purchase.management?.referenceMonth;
  if (typeof transferred === 'string' && validMonth(transferred)) return transferred;
  const original = purchase.form?.fields.referenceMonth;
  return typeof original === 'string' && validMonth(original) ? original : null;
}
export type MonthlyCalendar = { submission: string; review: string; complement: string; opinion: string; finance: string; decision: string; communication: string; execution: string; report: string };
/** Datas civis de Manaus: UTC é usado apenas para aritmética sem deslocar o dia. */
export function monthlyCalendar(month: string, holidays: string[] = []): MonthlyCalendar {
  if (!validMonth(month)) invalid('Mês de referência inválido.');
  if (!Array.isArray(holidays) || holidays.some(day => typeof day !== 'string' || !validDate(day))) invalid('Feriado inválido no calendário.');
  const [year, monthNumber] = month.split('-').map(Number);
  const holidaySet = new Set(holidays);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  const isBusinessDay = (date: Date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !holidaySet.has(format(date));
  const previousDeadline = (day: number) => {
    const date = new Date(Date.UTC(year, monthNumber - 2, day));
    while (!isBusinessDay(date)) date.setUTCDate(date.getUTCDate() - 1);
    return format(date);
  };
  const report = new Date(Date.UTC(year, monthNumber, 1));
  let counted = 0;
  while (true) {
    if (isBusinessDay(report)) counted++;
    if (counted === 5) break;
    report.setUTCDate(report.getUTCDate() + 1);
  }
  return {
    submission: previousDeadline(15), review: previousDeadline(18), complement: previousDeadline(20), opinion: previousDeadline(22),
    finance: previousDeadline(23), decision: previousDeadline(25), communication: previousDeadline(27), execution: `${month}-01`, report: format(report),
  };
}
