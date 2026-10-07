import { useCallback, useEffect, useState } from 'react';
import { fetchProducts } from '../api/fetchProducts';
import type { Product } from '../model/product';

export type ProductsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; products: readonly Product[] };

export type UseProductsResult = Readonly<{ state: ProductsState; retry: () => void }>;

export function useProducts(): UseProductsResult {
  const [state, setState] = useState<ProductsState>({ status: 'loading' });
  // Bumping the attempt re-runs the effect; the previous request is aborted by its cleanup.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal).then(
      (products) => {
        setState({ status: 'success', products });
      },
      (error: unknown) => {
        // An aborted request belongs to an unmounted or superseded effect, so it must not set state.
        if (controller.signal.aborted) {
          return;
        }
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Could not load products',
        });
      },
    );
    return () => {
      controller.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
