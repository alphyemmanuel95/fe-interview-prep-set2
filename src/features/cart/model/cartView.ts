import { assertNever } from '../../../shared/assertNever';
import { clampQuantity, MIN_QUANTITY, type CartState } from './cartReducer';
import { calculateTotals, type Totals } from './money';
import type { Product } from './product';

export type CatalogueState =
  { status: 'loading' } | { status: 'error' } | { status: 'success'; products: readonly Product[] };

export type AvailableLine = Readonly<{
  status: 'available';
  productId: number;
  product: Product;
  quantity: number;
}>;

export type UnavailableLine = Readonly<{
  status: 'unavailable';
  productId: number;
  title: string | null;
}>;

export type CartLineView = AvailableLine | UnavailableLine;

export type CartView =
  | { status: 'empty' }
  | { status: 'loading'; itemCount: number }
  | { status: 'error'; itemCount: number }
  | { status: 'ready'; itemCount: number; lines: readonly CartLineView[]; totals: Totals };

// Emptiness comes from the stored cart, not from the joined lines, so a failed or pending
// product fetch never makes a full cart look empty or show $0.00.
export function deriveCartView(cart: CartState, catalogue: CatalogueState): CartView {
  if (cart.length === 0) {
    return { status: 'empty' };
  }
  const storedItemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  switch (catalogue.status) {
    case 'loading':
      return { status: 'loading', itemCount: storedItemCount };
    case 'error':
      return { status: 'error', itemCount: storedItemCount };
    case 'success': {
      const lines = toLineViews(cart, catalogue.products);
      const available = lines.filter((line) => line.status === 'available');
      const totals = calculateTotals(
        available.map((line) => ({ priceCents: line.product.priceCents, quantity: line.quantity })),
      );
      const itemCount = available.reduce((sum, line) => sum + line.quantity, 0);
      return { status: 'ready', itemCount, lines, totals };
    }
    default:
      return assertNever(catalogue);
  }
}

// Lines whose product vanished or sold out stay visible as "unavailable" with a Remove button
// rather than being silently pruned: no effect rewrites stored state, and the user sees why.
// Quantities are clamped to current stock in case it dropped since the cart was saved.
function toLineViews(cart: CartState, products: readonly Product[]): readonly CartLineView[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  return cart.map((line): CartLineView => {
    const product = productsById.get(line.productId);
    if (product === undefined || product.stock < MIN_QUANTITY) {
      return { status: 'unavailable', productId: line.productId, title: product?.title ?? null };
    }
    return {
      status: 'available',
      productId: line.productId,
      product,
      quantity: clampQuantity(line.quantity, product.stock),
    };
  });
}
