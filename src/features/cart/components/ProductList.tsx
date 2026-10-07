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

function addButtonText(stock: number, inCart: number): string {
  if (stock === 0) {
    return 'Out of stock';
  }
  return inCart >= stock ? 'Max in cart' : 'Add to cart';
}

export function ProductList({ products, quantityInCart, onAdd }: ProductListProps): JSX.Element {
  return (
    <ul className="product-list" aria-label="Products">
      {products.map((product) => {
        const inCart = quantityInCart.get(product.id) ?? 0;
        const canAdd = inCart < product.stock;
        return (
          <li key={product.id} className="product-list__item">
            {/* Decorative: the title right below already names the product. */}
            <img
              className="product-list__image"
              src={product.thumbnail}
              alt=""
              width={THUMBNAIL_SIZE_PX}
              height={THUMBNAIL_SIZE_PX}
              loading="lazy"
            />
            <h3 className="product-list__title">{product.title}</h3>
            <p className="product-list__price">{formatCents(product.priceCents)}</p>
            <p className="product-list__stock">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </p>
            {/* aria-disabled keeps focus on the button when the last unit is added. */}
            <button
              type="button"
              className="product-list__add"
              aria-label={`Add ${product.title} to cart`}
              aria-disabled={!canAdd}
              onClick={() => {
                if (canAdd) {
                  onAdd(product);
                }
              }}
            >
              {addButtonText(product.stock, inCart)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
