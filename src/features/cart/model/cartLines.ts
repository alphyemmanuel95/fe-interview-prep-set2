import { clampQuantity, MIN_QUANTITY, type CartState } from './cartReducer';
import type { Product } from './product';

export type CartLineView = Readonly<{ product: Product; quantity: number; priceCents: number }>;

// Joins stored lines with live product data. Lines whose product is missing from the catalogue
// are skipped, and quantities are clamped to current stock in case it dropped since the save.
export function toCartLineViews(
  cart: CartState,
  productsById: ReadonlyMap<number, Product>,
): readonly CartLineView[] {
  return cart.flatMap((line) => {
    const product = productsById.get(line.productId);
    if (product === undefined || product.stock < MIN_QUANTITY) {
      return [];
    }
    const quantity = clampQuantity(line.quantity, product.stock);
    return [{ product, quantity, priceCents: product.priceCents }];
  });
}
