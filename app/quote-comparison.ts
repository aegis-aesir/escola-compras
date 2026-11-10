import { z } from 'zod';
import { roundMoney, subscriptionSchema } from './budget';
import type { Purchase } from './model';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Data de conversão inválida.');
/** Opcionais no armazenamento histórico; obrigatórios para os novos formulários. */
export const quoteMetadataSchema = z.object({
  coverage: z.array(z.number().finite().nonnegative().max(100000)).min(1).max(50).optional(),
  comparable: z.boolean().optional(),
  currency: z.enum(['BRL', 'USD', 'EUR', 'Outra']).optional(),
  priceBasis: z.enum(['term', 'cycle']).optional(),
  exchangeRate: z.number().finite().positive().max(1_000_000).optional(),
  exchangeDate: date.optional(),
});
type QuoteInput = z.infer<typeof quoteMetadataSchema> & { prices: number[]; freight: number; otherExpenses?: number };
export type QuoteComparison = {
  coverage: number[];
  comparable: boolean;
  currency: 'BRL' | 'USD' | 'EUR' | 'Outra';
  priceBasis: 'term' | 'cycle';
  /** Soma na moeda declarada, incluindo frete e despesas uma única vez. */
  originalTotal: number;
  /** BRL; null informa ausência de conversão, nunca valor zero presumido. */
  total: number | null;
  comparisonReady: boolean;
};
const invalid = (message: string): never => { throw Object.assign(new Error(message), { status: 400 }); };
const safeCents = (value: number, label: string, maximum: number) => {
  if (!Number.isFinite(value) || value < 0 || value > maximum) invalid(`${label} inválido.`);
  return Math.round(roundMoney(value) * 100);
};

/** Normaliza somente registros conferidos pela administração; não envia cotações. */
export function normalizeQuote<T extends QuoteInput>(purchase: Pick<Purchase, 'items' | 'form'>, input: T): T & QuoteComparison {
  const metadata = quoteMetadataSchema.parse(input);
  if (purchase.form && ['coverage', 'comparable', 'currency', 'priceBasis'].some(key => metadata[key as keyof typeof metadata] === undefined)) {
    invalid('Declare as quantidades ofertadas, a comparabilidade técnica, a moeda e a base temporal da proposta.');
  }
  if ((metadata.exchangeRate !== undefined) !== (metadata.exchangeDate !== undefined)) invalid('Informe a taxa e a data/base do câmbio juntas.');
  const coverage = metadata.coverage ?? purchase.items.map(item => item.quantity);
  const comparable = metadata.comparable ?? true;
  const currency = metadata.currency ?? 'BRL';
  const priceBasis = metadata.priceBasis ?? 'term';
  if (input.prices.length !== purchase.items.length || coverage.length !== purchase.items.length) invalid('Informe preço e quantidade ofertada para cada item do pedido.');
  const digital = purchase.form?.kind === 'digital' || purchase.items.some(item => item.subscription !== undefined);
  if (!digital && priceBasis === 'cycle') invalid('Base por ciclo somente se aplica a assinaturas com vigência e ciclos identificados.');
  let originalCents = safeCents(input.freight, 'Frete', 1_000_000) + safeCents(input.otherExpenses ?? 0, 'Outras despesas', 1_000_000);
  let fullCoverage = true;
  let periodKnown = true;
  for (let index = 0; index < purchase.items.length; index++) {
    const item = purchase.items[index];
    const offered = coverage[index];
    const cents = safeCents(input.prices[index], 'Preço unitário', 10_000_000);
    if ((offered === 0 && cents !== 0) || (offered > 0 && cents === 0)) invalid('Item não ofertado deve ter quantidade e preço zero; item ofertado exige preço positivo.');
    if (digital && !Number.isInteger(offered)) invalid('A quantidade de licenças ofertadas deve ser inteira.');
    if (offered !== item.quantity) fullCoverage = false;
    let cycles = 1;
    if (digital && offered > 0) {
      const period = subscriptionSchema.safeParse(item.subscription);
      if (!period.success) periodKnown = false;
      if (priceBasis === 'cycle') {
        cycles = period.success ? period.data.cycles : invalid('Identifique a vigência e a quantidade de ciclos de cada assinatura antes de registrar preço por ciclo.');
      }
    }
    originalCents += Math.round(cents * offered * cycles);
    if (!Number.isSafeInteger(originalCents)) invalid('Total da proposta excede o limite de cálculo seguro.');
  }
  const originalTotal = originalCents / 100;
  let total: number | null = currency === 'BRL' ? originalTotal : null;
  if (currency !== 'BRL' && metadata.exchangeRate !== undefined && metadata.exchangeDate) {
    const converted = Math.round(originalCents * metadata.exchangeRate);
    if (!Number.isSafeInteger(converted)) invalid('Total convertido excede o limite de cálculo seguro.');
    total = converted / 100;
  }
  return {
    ...input,
    prices: input.prices.map(roundMoney), freight: roundMoney(input.freight), ...(input.otherExpenses !== undefined ? { otherExpenses: roundMoney(input.otherExpenses) } : {}),
    coverage, comparable, currency, priceBasis, originalTotal, total,
    comparisonReady: fullCoverage && comparable && periodKnown && total !== null,
  };
}

type ComparableCandidate = Partial<QuoteComparison> & { exchangeRate?: number; exchangeDate?: string };
/** O contexto impede considerar uma proposta antiga como válida em formulário novo. */
export function quoteComparable(quote: ComparableCandidate, purchase?: { form?: Purchase['form'] }): boolean {
  const complete = quote.comparisonReady === true && quote.comparable === true && typeof quote.total === 'number' && Number.isFinite(quote.total) && quote.total >= 0;
  if (purchase?.form) return complete;
  if (quote.comparisonReady !== undefined) return complete;
  // Compatibilidade com propostas anteriores ao formulário estruturado.
  return !['coverage', 'comparable', 'currency', 'priceBasis', 'exchangeRate', 'exchangeDate', 'originalTotal'].some(key => quote[key as keyof ComparableCandidate] !== undefined)
    && (quote.total === undefined || (typeof quote.total === 'number' && Number.isFinite(quote.total) && quote.total >= 0));
}
