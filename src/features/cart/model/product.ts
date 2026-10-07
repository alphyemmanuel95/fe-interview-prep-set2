import { toCents } from './money';

export type Product = Readonly<{
  id: number;
  title: string;
  priceCents: number;
  thumbnail: string;
  stock: number;
}>;

type ProductDto = Readonly<{
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  stock: number;
}>;

type ProductsResponseDto = Readonly<{ products: readonly ProductDto[] }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isProductDto = (value: unknown): value is ProductDto =>
  isRecord(value) &&
  Number.isInteger(value['id']) &&
  typeof value['title'] === 'string' &&
  typeof value['price'] === 'number' &&
  Number.isFinite(value['price']) &&
  typeof value['thumbnail'] === 'string' &&
  Number.isInteger(value['stock']);

export const isProductsResponse = (value: unknown): value is ProductsResponseDto =>
  isRecord(value) && Array.isArray(value['products']) && value['products'].every(isProductDto);

export function toProduct(dto: ProductDto): Product {
  return {
    id: dto.id,
    title: dto.title,
    priceCents: toCents(dto.price),
    thumbnail: dto.thumbnail,
    stock: dto.stock,
  };
}
