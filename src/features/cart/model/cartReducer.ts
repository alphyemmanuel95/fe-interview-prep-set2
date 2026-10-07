import { assertNever } from '../../../shared/assertNever';

export type CartLine = Readonly<{ productId: number; quantity: number }>;

export type CartState = readonly CartLine[];

export type CartAction =
  | { type: 'add'; productId: number; stock: number }
  | { type: 'setQuantity'; productId: number; quantity: number; stock: number }
  | { type: 'remove'; productId: number };

export const MIN_QUANTITY = 1;

export function clampQuantity(quantity: number, stock: number): number {
  return Math.min(Math.max(Math.trunc(quantity), MIN_QUANTITY), stock);
}

// The stock limit is enforced here, not only by disabled buttons, so no caller
// (UI, restored storage, a future input field) can put the cart into an impossible state.
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      if (action.stock < MIN_QUANTITY) {
        return state;
      }
      const existing = state.find((line) => line.productId === action.productId);
      if (existing === undefined) {
        return [...state, { productId: action.productId, quantity: MIN_QUANTITY }];
      }
      return updateQuantity(state, action.productId, existing.quantity + 1, action.stock);
    }
    case 'setQuantity':
      return updateQuantity(state, action.productId, action.quantity, action.stock);
    case 'remove':
      return state.filter((line) => line.productId !== action.productId);
    default:
      return assertNever(action);
  }
}

function updateQuantity(
  state: CartState,
  productId: number,
  quantity: number,
  stock: number,
): CartState {
  if (stock < MIN_QUANTITY) {
    return state.filter((line) => line.productId !== productId);
  }
  const nextQuantity = clampQuantity(quantity, stock);
  return state.map((line) =>
    line.productId === productId ? { ...line, quantity: nextQuantity } : line,
  );
}

const isCartLine = (value: unknown): value is CartLine =>
  typeof value === 'object' &&
  value !== null &&
  'productId' in value &&
  Number.isInteger(value.productId) &&
  'quantity' in value &&
  typeof value.quantity === 'number' &&
  Number.isInteger(value.quantity) &&
  value.quantity >= MIN_QUANTITY;

export const isCartState = (value: unknown): value is CartState =>
  Array.isArray(value) && value.every(isCartLine);
