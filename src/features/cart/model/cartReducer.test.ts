import { describe, expect, it } from 'vitest';
import { cartReducer, isCartState, type CartState } from './cartReducer';

describe('cartReducer', () => {
  it('adds a new product with quantity 1', () => {
    expect(cartReducer([], { type: 'add', productId: 1, stock: 5 })).toEqual([
      { productId: 1, quantity: 1 },
    ]);
  });

  it('increments an existing line but never past stock', () => {
    const state: CartState = [{ productId: 1, quantity: 2 }];
    const once = cartReducer(state, { type: 'add', productId: 1, stock: 3 });
    const twice = cartReducer(once, { type: 'add', productId: 1, stock: 3 });
    expect(once).toEqual([{ productId: 1, quantity: 3 }]);
    expect(twice).toEqual([{ productId: 1, quantity: 3 }]);
  });

  it('does not add an out-of-stock product', () => {
    expect(cartReducer([], { type: 'add', productId: 1, stock: 0 })).toEqual([]);
  });

  it('clamps setQuantity between 1 and stock', () => {
    const state: CartState = [{ productId: 1, quantity: 2 }];
    expect(
      cartReducer(state, { type: 'setQuantity', productId: 1, quantity: 99, stock: 4 }),
    ).toEqual([{ productId: 1, quantity: 4 }]);
    expect(
      cartReducer(state, { type: 'setQuantity', productId: 1, quantity: 0, stock: 4 }),
    ).toEqual([{ productId: 1, quantity: 1 }]);
  });

  it('removes a line', () => {
    const state: CartState = [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 3 },
    ];
    expect(cartReducer(state, { type: 'remove', productId: 1 })).toEqual([
      { productId: 2, quantity: 3 },
    ]);
  });
});

describe('isCartState', () => {
  it('accepts valid lines and rejects malformed ones', () => {
    expect(isCartState([{ productId: 1, quantity: 2 }])).toBe(true);
    expect(isCartState([{ productId: 1, quantity: 0 }])).toBe(false);
    expect(isCartState([{ productId: '1', quantity: 2 }])).toBe(false);
    expect(isCartState({})).toBe(false);
    expect(
      isCartState([
        { productId: 1, quantity: 1 },
        { productId: 1, quantity: 2 },
      ]),
    ).toBe(false);
  });
});
