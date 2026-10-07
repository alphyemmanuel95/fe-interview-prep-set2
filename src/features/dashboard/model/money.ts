const CENTS_PER_UNIT = 100;
// Fixed rather than the browser default so amounts (and the tests asserting them) render the
// same on every machine.
const MONEY_LOCALE = 'en-US';

export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / CENTS_PER_UNIT);
}
