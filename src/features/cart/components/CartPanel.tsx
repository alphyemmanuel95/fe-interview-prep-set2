import { useRef, type JSX } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { CartLineView, CartView } from '../model/cartView';
import { formatCents, TAX_RATE, type Totals } from '../model/money';
import type { Product } from '../model/product';
import { CartLineItem, UnavailableCartLineItem } from './CartLineItem';
import './CartPanel.css';

const PERCENT = 100;

export const CART_HEADING_ID = 'cart-heading';

export type CartPanelProps = Readonly<{
  view: CartView;
  onQuantityChange: (product: Product, quantity: number) => void;
  onRemove: (productId: number, title: string) => void;
  onRetry: () => void;
}>;

export function CartPanel({
  view,
  onQuantityChange,
  onRemove,
  onRetry,
}: CartPanelProps): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The removed line's button disappears with it, so focus moves to the cart heading
  // instead of falling back to <body> and losing the keyboard user's place.
  const handleRemove = (productId: number, title: string): void => {
    onRemove(productId, title);
    headingRef.current?.focus();
  };

  const renderLine = (line: CartLineView): JSX.Element =>
    line.status === 'available' ? (
      <CartLineItem
        key={line.productId}
        line={line}
        onQuantityChange={onQuantityChange}
        onRemove={handleRemove}
      />
    ) : (
      <UnavailableCartLineItem key={line.productId} line={line} onRemove={handleRemove} />
    );

  const renderBody = (): JSX.Element => {
    switch (view.status) {
      case 'empty':
        return (
          <>
            <p className="cart__message">Your cart is empty. Add a product to get started.</p>
            <CartTotals totals={{ subtotalCents: 0, taxCents: 0, totalCents: 0 }} />
          </>
        );
      case 'loading':
        return <p className="cart__message">Loading your cart…</p>;
      case 'error':
        return (
          <div className="cart__message">
            <p>Can&apos;t show your cart until products load.</p>
            <button type="button" className="cart__retry" onClick={onRetry}>
              Retry loading products
            </button>
          </div>
        );
      case 'ready':
        return (
          <>
            <ul className="cart__list">{view.lines.map(renderLine)}</ul>
            <CartTotals totals={view.totals} />
          </>
        );
      default:
        return assertNever(view);
    }
  };

  return (
    <aside className="cart" aria-labelledby={CART_HEADING_ID}>
      <h2 id={CART_HEADING_ID} className="cart__heading" ref={headingRef} tabIndex={-1}>
        Your cart
      </h2>
      {renderBody()}
    </aside>
  );
}

type CartTotalsProps = Readonly<{ totals: Totals }>;

function CartTotals({ totals }: CartTotalsProps): JSX.Element {
  return (
    <dl className="cart__totals">
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
  );
}
