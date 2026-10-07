import type { JSX } from 'react';
import type { CartLineView } from '../model/cartLines';
import { MIN_QUANTITY } from '../model/cartReducer';
import { formatCents } from '../model/money';
import type { Product } from '../model/product';

const THUMBNAIL_SIZE_PX = 48;

export type CartLineItemProps = Readonly<{
  line: CartLineView;
  onQuantityChange: (product: Product, quantity: number) => void;
  onRemove: (product: Product) => void;
}>;

export function CartLineItem({ line, onQuantityChange, onRemove }: CartLineItemProps): JSX.Element {
  const { product, quantity } = line;
  return (
    <li className="cart__item">
      <img
        className="cart__thumbnail"
        src={product.thumbnail}
        alt=""
        width={THUMBNAIL_SIZE_PX}
        height={THUMBNAIL_SIZE_PX}
      />
      <div className="cart__details">
        <p className="cart__name">{product.title}</p>
        <p className="cart__line-price">
          {formatCents(line.priceCents)} × {quantity} ={' '}
          <strong>{formatCents(line.priceCents * quantity)}</strong>
        </p>
        <div className="cart__controls" role="group" aria-label={`Quantity of ${product.title}`}>
          <button
            type="button"
            className="cart__step"
            aria-label={`Decrease quantity of ${product.title}`}
            disabled={quantity <= MIN_QUANTITY}
            onClick={() => {
              onQuantityChange(product, quantity - 1);
            }}
          >
            −
          </button>
          <span className="cart__quantity">
            <span className="visually-hidden">Quantity </span>
            {quantity}
          </span>
          <button
            type="button"
            className="cart__step"
            aria-label={`Increase quantity of ${product.title}`}
            disabled={quantity >= product.stock}
            onClick={() => {
              onQuantityChange(product, quantity + 1);
            }}
          >
            +
          </button>
          <button
            type="button"
            className="cart__remove"
            aria-label={`Remove ${product.title} from cart`}
            onClick={() => {
              onRemove(product);
            }}
          >
            Remove
          </button>
        </div>
        {quantity >= product.stock && <p className="cart__hint">Maximum stock reached</p>}
      </div>
    </li>
  );
}
