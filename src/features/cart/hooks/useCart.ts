import { useEffect, useReducer, type ActionDispatch } from 'react';
import { loadFromStorage, saveToStorage } from '../../../shared/storage';
import { cartReducer, isCartState, type CartAction, type CartState } from '../model/cartReducer';

const CART_STORAGE_KEY = 'cart';
const CART_STORAGE_VERSION = 1;
const EMPTY_CART: CartState = [];

const loadCart = (): CartState =>
  loadFromStorage(CART_STORAGE_KEY, CART_STORAGE_VERSION, isCartState, EMPTY_CART);

export type UseCartResult = Readonly<{ cart: CartState; dispatch: ActionDispatch<[CartAction]> }>;

// Only product ids and quantities are persisted; prices, stock and totals are re-derived from
// fresh product data so a stale save can never show an outdated price.
export function useCart(): UseCartResult {
  const [cart, dispatch] = useReducer(cartReducer, undefined, loadCart);

  useEffect(() => {
    saveToStorage(CART_STORAGE_KEY, CART_STORAGE_VERSION, cart);
  }, [cart]);

  return { cart, dispatch };
}
