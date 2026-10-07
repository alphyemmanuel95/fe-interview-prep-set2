import type { JSX } from 'react';
import { MIN_QUANTITY } from '../model/cartReducer';
import type { AvailableLine, UnavailableLine } from '../model/cartView';
import { formatCents } from '../model/money';
import type { Product } from '../model/product';
import './CartLineItem.css';

const THUMBNAIL_SIZE_PX = 48;

export type CartLineItemProps = Readonly<{
  line: AvailableLine;
  onQuantityChange: (product: Product, quantity: number) => void;
  onRemove: (productId: number, title: string) => void;
}>;

export function CartLineItem({ line, onQuantityChange, onRemove }: CartLineItemProps): JSX.Element {
  const { product, quantity } = line;
  const canDecrease = quantity > MIN_QUANTITY;
  const canIncrease = quantity < product.stock;
  const hintId = `cart-line-hint-${product.id}`;

  // aria-disabled (not `disabled`) keeps the button focusable when it hits a limit, so keyboard
  // focus stays put instead of dropping to <body>; the handler guards the no-op click.
  const handleDecrease = (): void => {
    if (canDecrease) {
      onQuantityChange(product, quantity - 1);
    }
  };
  const handleIncrease = (): void => {
    if (canIncrease) {
      onQuantityChange(product, quantity + 1);
    }
  };

  return (
    <li className="cart-line">
      <img
        className="cart-line__thumbnail"
        src={product.thumbnail}
        alt=""
        width={THUMBNAIL_SIZE_PX}
        height={THUMBNAIL_SIZE_PX}
      />
      <div className="cart-line__details">
        <p className="cart-line__name">{product.title}</p>
        <p className="cart-line__price">
          {formatCents(product.priceCents)} × {quantity} ={' '}
          <strong>{formatCents(product.priceCents * quantity)}</strong>
        </p>
        <div
          className="cart-line__controls"
          role="group"
          aria-label={`Quantity of ${product.title}`}
        >
          <button
            type="button"
            className="cart-line__step"
            aria-label={`Decrease quantity of ${product.title}`}
            aria-disabled={!canDecrease}
            onClick={handleDecrease}
          >
            −
          </button>
          <span className="cart-line__quantity">
            <span className="visually-hidden">Quantity </span>
            {quantity}
          </span>
          <button
            type="button"
            className="cart-line__step"
            aria-label={`Increase quantity of ${product.title}`}
            aria-disabled={!canIncrease}
            aria-describedby={canIncrease ? undefined : hintId}
            onClick={handleIncrease}
          >
            +
          </button>
          <button
            type="button"
            className="cart-line__remove"
            aria-label={`Remove ${product.title} from cart`}
            onClick={() => {
              onRemove(product.id, product.title);
            }}
          >
            Remove
          </button>
        </div>
        {!canIncrease && (
          <p id={hintId} className="cart-line__hint">
            Maximum stock reached
          </p>
        )}
      </div>
    </li>
  );
}

export type UnavailableCartLineItemProps = Readonly<{
  line: UnavailableLine;
  onRemove: (productId: number, title: string) => void;
}>;

export function UnavailableCartLineItem({
  line,
  onRemove,
}: UnavailableCartLineItemProps): JSX.Element {
  const title = line.title ?? 'Unavailable item';
  return (
    <li className="cart-line cart-line--unavailable">
      <div className="cart-line__details">
        <p className="cart-line__name">{title}</p>
        <p className="cart-line__hint">Unavailable: no longer in stock or in the catalogue.</p>
        <div className="cart-line__controls">
          <button
            type="button"
            className="cart-line__remove"
            aria-label={`Remove ${title} from cart`}
            onClick={() => {
              onRemove(line.productId, title);
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
