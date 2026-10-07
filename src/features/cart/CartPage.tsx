import type { JSX } from 'react';
import { CartPanel } from './components/CartPanel';
import { ProductList } from './components/ProductList';
import { useCart } from './hooks/useCart';
import { useProducts } from './hooks/useProducts';
import { toCartLineViews } from './model/cartLines';
import { calculateTotals } from './model/money';
import type { Product } from './model/product';
import './CartPage.css';

const NO_PRODUCTS: readonly Product[] = [];

export function CartPage(): JSX.Element {
  const { state: productsState, retry } = useProducts();
  const { cart, dispatch } = useCart();

  // Everything below is derived during render from the two sources of truth (products, cart),
  // so a quantity change updates every total in the same render with nothing to keep in sync.
  const products = productsState.status === 'success' ? productsState.products : NO_PRODUCTS;
  const productsById = new Map(products.map((product) => [product.id, product]));
  const lines = toCartLineViews(cart, productsById);
  const quantityInCart = new Map(lines.map((line) => [line.product.id, line.quantity]));
  const totals = calculateTotals(lines);

  const handleAdd = (product: Product): void => {
    dispatch({ type: 'add', productId: product.id, stock: product.stock });
  };
  const handleQuantityChange = (product: Product, quantity: number): void => {
    dispatch({ type: 'setQuantity', productId: product.id, quantity, stock: product.stock });
  };
  const handleRemove = (product: Product): void => {
    dispatch({ type: 'remove', productId: product.id });
  };

  return (
    <section className="cart-page" aria-labelledby="page-title">
      <h1 id="page-title">Shopping Cart</h1>
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
            <ProductList products={products} quantityInCart={quantityInCart} onAdd={handleAdd} />
          )}
        </div>
        <CartPanel
          lines={lines}
          totals={totals}
          isLoading={productsState.status === 'loading'}
          onQuantityChange={handleQuantityChange}
          onRemove={handleRemove}
        />
      </div>
    </section>
  );
}
