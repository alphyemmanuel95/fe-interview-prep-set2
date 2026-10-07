import { isProductsResponse, toProduct, type Product } from '../model/product';

const PRODUCTS_URL = 'https://dummyjson.com/products?limit=30&select=title,price,thumbnail,stock';

export async function fetchProducts(signal: AbortSignal): Promise<readonly Product[]> {
  const response = await fetch(PRODUCTS_URL, { signal });
  if (!response.ok) {
    throw new Error(`Products request failed with status ${response.status}`);
  }
  const body: unknown = await response.json();
  if (!isProductsResponse(body)) {
    throw new Error('Products response had an unexpected shape');
  }
  return body.products.map(toProduct);
}
