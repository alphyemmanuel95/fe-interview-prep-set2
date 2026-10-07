import { useRef, type JSX } from 'react';
import type { CartLineView } from '../model/cartLines';
import { formatCents, TAX_RATE, type Totals } from '../model/money';
import type { Product } from '../model/product';
import { CartLineItem } from './CartLineItem';
import './CartPanel.css';

const PERCENT = 100;

export type CartPanelProps = Readonly<{
  lines: readonly CartLineView[];
  totals: Totals;
  isLoading: boolean;
  onQuantityChange: (product: Product, quantity: number) => void;
  onRemove: (product: Product) => void;
}>;

export function CartPanel({
  lines,
  totals,
  isLoading,
  onQuantityChange,
  onRemove,
}: CartPanelProps): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The removed line's button disappears with it, so focus moves to the cart heading
  // instead of falling back to <body> and losing the keyboard user's place.
  const handleRemove = (product: Product): void => {
    onRemove(product);
    headingRef.current?.focus();
  };

  return (
    <aside className="cart" aria-labelledby="cart-heading">
      <h2 id="cart-heading" className="cart__heading" ref={headingRef} tabIndex={-1}>
        Your cart
      </h2>
      {isLoading && <p className="cart__empty">Loading your cart…</p>}
      {!isLoading && lines.length === 0 && (
        <p className="cart__empty">Your cart is empty. Add a product to get started.</p>
      )}
      {lines.length > 0 && (
        <ul className="cart__list">
          {lines.map((line) => (
            <CartLineItem
              key={line.product.id}
              line={line}
              onQuantityChange={onQuantityChange}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}
      <dl className="cart__totals" aria-live="polite">
        <div className="cart__total-row">
          <dt>Subtotal</dt>
          <dd>{formatCents(totals.subtotalCents)}</dd>
        </div>
        <div className="cart__total-row">
          <dt>Tax ({Math.round(TAX_RATE * PERCENT)}%)</dt>
          <dd>{formatCents(totals.taxCents)}</dd>
        </div>
        <div className="cart__total-row cart__total-row--grand">
          <dt>Total</dt>
          <dd>{formatCents(totals.totalCents)}</dd>
        </div>
      </dl>
    </aside>
  );
}
