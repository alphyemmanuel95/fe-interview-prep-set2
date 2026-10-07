// Pure data generator for the mock dashboard API. `random` and `now` are injected so it is
// deterministic under test; the Vite middleware passes Math.random and the current time.

export type MockOrder = Readonly<{
  id: string;
  customer: string;
  amountCents: number;
  createdAt: string;
}>;

export type DashboardPayload = Readonly<{
  sales: Readonly<{ totalCents: number; currency: string }>;
  activeUsers: number;
  recentOrders: readonly MockOrder[];
}>;

export type MockDashboardState = Readonly<{
  payload: DashboardPayload;
  nextOrderNumber: number;
}>;

export type RandomSource = () => number;

const CURRENCY = 'USD';
const INITIAL_SALES_CENTS = 1_284_350;
const INITIAL_ACTIVE_USERS = 140;
const MIN_ACTIVE_USERS = 20;
const MAX_ACTIVE_USERS_SWING = 18;
const FIRST_ORDER_NUMBER = 1_001;
const MAX_RECENT_ORDERS = 5;
const MIN_ORDER_CENTS = 1_500;
const MAX_ORDER_CENTS = 48_000;
// Orders arrive only on some calls, so the sales and orders widgets often keep identical data
// between polls — that is what makes the "unchanged widgets don't re-render" rule observable.
const NEW_ORDER_PROBABILITY = 0.5;
const CUSTOMERS = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Katherine Johnson',
  'Linus Torvalds',
  'Margaret Hamilton',
  'Tim Berners-Lee',
  'Barbara Liskov',
] as const;

const randomInt = (random: RandomSource, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));

function createOrder(orderNumber: number, random: RandomSource, now: Date): MockOrder {
  return {
    id: `ORD-${orderNumber}`,
    customer: CUSTOMERS[randomInt(random, 0, CUSTOMERS.length - 1)] ?? 'Guest',
    amountCents: randomInt(random, MIN_ORDER_CENTS, MAX_ORDER_CENTS),
    createdAt: now.toISOString(),
  };
}

// Always moves by at least one so the active-users value changes on every call.
function nextActiveUsers(current: number, random: RandomSource): number {
  const delta = randomInt(random, 1, MAX_ACTIVE_USERS_SWING);
  const shouldDecrease = random() < 0.5 && current - delta >= MIN_ACTIVE_USERS;
  return shouldDecrease ? current - delta : current + delta;
}

export function createInitialState(): MockDashboardState {
  return {
    payload: {
      sales: { totalCents: INITIAL_SALES_CENTS, currency: CURRENCY },
      activeUsers: INITIAL_ACTIVE_USERS,
      recentOrders: [],
    },
    nextOrderNumber: FIRST_ORDER_NUMBER,
  };
}

export function advanceDashboard(
  state: MockDashboardState,
  random: RandomSource,
  now: Date,
): MockDashboardState {
  const { payload } = state;
  const activeUsers = nextActiveUsers(payload.activeUsers, random);
  if (random() >= NEW_ORDER_PROBABILITY) {
    return { ...state, payload: { ...payload, activeUsers } };
  }

  const order = createOrder(state.nextOrderNumber, random, now);
  return {
    nextOrderNumber: state.nextOrderNumber + 1,
    payload: {
      activeUsers,
      sales: { ...payload.sales, totalCents: payload.sales.totalCents + order.amountCents },
      recentOrders: [order, ...payload.recentOrders].slice(0, MAX_RECENT_ORDERS),
    },
  };
}
