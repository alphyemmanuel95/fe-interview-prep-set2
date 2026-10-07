import type { JSX } from 'react';
import { formatCents } from '../model/money';
import type { Product } from '../model/product';
import './ProductList.css';

const THUMBNAIL_SIZE_PX = 160;

export type ProductListProps = Readonly<{
  products: readonly Product[];
  quantityInCart: ReadonlyMap<number, number>;
  onAdd: (product: Product) => void;
}>;

export function ProductList({ products, quantityInCart, onAdd }: ProductListProps): JSX.Element {
  return (
    <ul className="product-list" aria-label="Products">
      {products.map((product) => {
        const inCart = quantityInCart.get(product.id) ?? 0;
        const canAdd = inCart < product.stock;
        return (
          <li key={product.id} className="product-list__item">
            <img
              className="product-list__image"
              src={product.thumbnail}
              alt={product.title}
              width={THUMBNAIL_SIZE_PX}
              height={THUMBNAIL_SIZE_PX}
              loading="lazy"
            />
            <h3 className="product-list__title">{product.title}</h3>
            <p className="product-list__price">{formatCents(product.priceCents)}</p>
            <p className="product-list__stock">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </p>
            <button
              type="button"
              className="product-list__add"
              aria-label={`Add ${product.title} to cart`}
              disabled={!canAdd}
              onClick={() => {
                onAdd(product);
              }}
            >
              {canAdd ? 'Add to cart' : 'Max in cart'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
