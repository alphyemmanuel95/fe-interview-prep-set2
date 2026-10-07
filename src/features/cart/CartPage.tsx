import { useState, type JSX } from 'react';
import { CART_HEADING_ID, CartPanel } from './components/CartPanel';
import { ProductList } from './components/ProductList';
import { useCart } from './hooks/useCart';
import { useProducts } from './hooks/useProducts';
import { cartReducer, type CartAction } from './model/cartReducer';
import { deriveCartView, type CartView } from './model/cartView';
import { formatCents } from './model/money';
import type { Product } from './model/product';
import './CartPage.css';

function describeTotal(view: CartView): string {
  return view.status === 'ready'
    ? `Total ${formatCents(view.totals.totalCents)}`
    : 'Your cart is empty';
}

function quantitiesByProductId(view: CartView): ReadonlyMap<number, number> {
  if (view.status !== 'ready') {
    return new Map();
  }
  return new Map(
    view.lines.flatMap((line) =>
      line.status === 'available' ? [[line.productId, line.quantity] as const] : [],
    ),
  );
}

export function CartPage(): JSX.Element {
  const { state: productsState, retry } = useProducts();
  const { cart, dispatch } = useCart();
  // One short message per user action; starts empty so nothing is announced on load.
  const [announcement, setAnnouncement] = useState('');

  // The view (lines, totals, counts) is derived during render from the two sources of truth,
  // so a quantity change updates every total in the same render with nothing to keep in sync.
  const view = deriveCartView(cart, productsState);
  const itemCount = view.status === 'empty' ? 0 : view.itemCount;

  // The reducer is pure, so running it here to preview the next total is safe and cheap.
  const applyAndAnnounce = (action: CartAction, message: string): void => {
    dispatch(action);
    const nextView = deriveCartView(cartReducer(cart, action), productsState);
    setAnnouncement(`${message}. ${describeTotal(nextView)}`);
  };

  const handleAdd = (product: Product): void => {
    applyAndAnnounce(
      { type: 'add', productId: product.id, stock: product.stock },
      `Added ${product.title}`,
    );
  };
  const handleQuantityChange = (product: Product, quantity: number): void => {
    applyAndAnnounce(
      { type: 'setQuantity', productId: product.id, quantity, stock: product.stock },
      `${product.title} quantity ${quantity}`,
    );
  };
  const handleRemove = (productId: number, title: string): void => {
    applyAndAnnounce({ type: 'remove', productId }, `Removed ${title}`);
  };

  return (
    <section className="cart-page" aria-labelledby="page-title">
      <h1 id="page-title">Shopping Cart</h1>
      <a className="cart-page__summary-link" href={`#${CART_HEADING_ID}`}>
        Cart ({itemCount}){view.status === 'ready' && ` · ${formatCents(view.totals.totalCents)}`}
      </a>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
      <div className="cart-page__layout">
        <div className="cart-page__products">
          <h2 className="visually-hidden">Products</h2>
          <div aria-live="polite">
            {productsState.status === 'loading' && <p>Loading products…</p>}
            {productsState.status === 'error' && (
              <div className="cart-page__error" role="alert">
                <p>Could not load products: {productsState.error}</p>
                <button type="button" className="cart-page__retry" onClick={retry}>
                  Try again
                </button>
              </div>
            )}
          </div>
          {productsState.status === 'success' && (
            <ProductList
              products={productsState.products}
              quantityInCart={quantitiesByProductId(view)}
              onAdd={handleAdd}
            />
          )}
        </div>
        <div className="cart-page__cart">
          <CartPanel
            view={view}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
            onRetry={retry}
          />
        </div>
      </div>
    </section>
  );
}
