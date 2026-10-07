import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveToStorage } from '../../shared/storage';
import { CartPage } from './CartPage';

const PRODUCTS_BODY = {
  products: [
    { id: 1, title: 'Mascara', price: 19.99, thumbnail: 'https://example.test/1.png', stock: 3 },
    { id: 2, title: 'Lipstick', price: 9.99, thumbnail: 'https://example.test/2.png', stock: 10 },
  ],
};

function totalValue(label: string): string | null {
  const row = screen.getByText(label, { selector: 'dt' }).closest('div');
  if (row === null) {
    throw new Error(`No totals row for ${label}`);
  }
  return within(row).getByRole('definition').textContent;
}

describe('CartPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(PRODUCTS_BODY)))),
    );
  });

  it('shows the empty state, then updates every total when a quantity changes', async () => {
    const user = userEvent.setup();
    render(<CartPage />);

    expect(await screen.findByText(/your cart is empty/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add Mascara to cart' }));

    // 1 x $19.99 -> tax 359.82c rounds to $3.60
    expect(totalValue('Subtotal')).toBe('$19.99');
    expect(totalValue('Tax (18%)')).toBe('$3.60');
    expect(totalValue('Total')).toBe('$23.59');

    await user.click(screen.getByRole('button', { name: 'Increase quantity of Mascara' }));

    // 2 x $19.99 = $39.98 -> tax 719.64c rounds to $7.20
    expect(totalValue('Subtotal')).toBe('$39.98');
    expect(totalValue('Tax (18%)')).toBe('$7.20');
    expect(totalValue('Total')).toBe('$47.18');
  });

  it('never lets the quantity exceed stock', async () => {
    const user = userEvent.setup();
    render(<CartPage />);

    await user.click(await screen.findByRole('button', { name: 'Add Mascara to cart' }));
    const increase = screen.getByRole('button', { name: 'Increase quantity of Mascara' });
    await user.click(increase);
    await user.click(increase);

    expect(increase).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Mascara to cart' })).toBeDisabled();
    expect(totalValue('Subtotal')).toBe('$59.97');
  });

  it('restores the cart from storage and empties it on remove', async () => {
    saveToStorage('cart', 1, [{ productId: 2, quantity: 2 }]);
    const user = userEvent.setup();
    render(<CartPage />);

    const remove = await screen.findByRole('button', { name: 'Remove Lipstick from cart' });
    expect(totalValue('Subtotal')).toBe('$19.98');

    await user.click(remove);

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(totalValue('Total')).toBe('$0.00');
    expect(screen.getByRole('heading', { name: 'Your cart' })).toHaveFocus();
  });

  it('shows an error with a working retry when products fail to load', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    render(<CartPage />);

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', { name: 'Add Mascara to cart' })).toBeEnabled();
  });
});
