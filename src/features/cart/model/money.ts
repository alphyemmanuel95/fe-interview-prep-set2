export const TAX_RATE = 0.18;

const CENTS_PER_UNIT = 100;

// Money is held in integer cents so sums stay exact; floats like 0.1 + 0.2 would drift.
export function toCents(amount: number): number {
  return Math.round(amount * CENTS_PER_UNIT);
}

export type PricedLine = Readonly<{ priceCents: number; quantity: number }>;

export type Totals = Readonly<{ subtotalCents: number; taxCents: number; totalCents: number }>;

export function calculateTotals(lines: readonly PricedLine[]): Totals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  // Tax is rounded once, on the subtotal, so the displayed parts always add up to the total.
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / CENTS_PER_UNIT);
}
