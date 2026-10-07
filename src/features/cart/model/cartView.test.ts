import { describe, expect, it } from 'vitest';
import { deriveCartView } from './cartView';
import type { Product } from './product';

const MASCARA: Product = {
  id: 1,
  title: 'Mascara',
  priceCents: 1999,
  thumbnail: 'https://example.test/1.png',
  stock: 2,
};

describe('deriveCartView', () => {
  it('is empty only when the stored cart is empty', () => {
    expect(deriveCartView([], { status: 'error' })).toEqual({ status: 'empty' });
    expect(deriveCartView([{ productId: 1, quantity: 2 }], { status: 'error' })).toEqual({
      status: 'error',
      itemCount: 2,
    });
  });

  it('marks missing products unavailable and excludes them from totals', () => {
    const view = deriveCartView(
      [
        { productId: 1, quantity: 5 },
        { productId: 99, quantity: 1 },
      ],
      { status: 'success', products: [MASCARA] },
    );
    expect(view).toEqual({
      status: 'ready',
      itemCount: 2,
      lines: [
        { status: 'available', productId: 1, product: MASCARA, quantity: 2 },
        { status: 'unavailable', productId: 99, title: null },
      ],
      totals: { subtotalCents: 3998, taxCents: 720, totalCents: 4718 },
    });
  });
});
