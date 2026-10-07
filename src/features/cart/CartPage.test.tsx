import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveToStorage } from '../../shared/storage';
import { CartPage } from './CartPage';

const PRODUCTS_BODY = {
  products: [
    { id: 1, title: 'Mascara', price: 19.99, thumbnail: 'https://example.test/1.png', stock: 3 },
    { id: 2, title: 'Lipstick', price: 9.99, thumbnail: 'https://example.test/2.png', stock: 10 },
    { id: 3, title: 'Perfume', price: 49.99, thumbnail: 'https://example.test/3.png', stock: 0 },
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
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: 'Add Mascara to cart' }));

    // 1 x $19.99 -> tax 359.82c rounds to $3.60
    expect(totalValue('Subtotal')).toBe('$19.99');
    expect(totalValue('Tax (18%)')).toBe('$3.60');
    expect(totalValue('Total')).toBe('$23.59');
    expect(screen.getByRole('status')).toHaveTextContent('Added Mascara. Total $23.59');

    await user.click(screen.getByRole('button', { name: 'Increase quantity of Mascara' }));

    // 2 x $19.99 = $39.98 -> tax 719.64c rounds to $7.20
    expect(totalValue('Subtotal')).toBe('$39.98');
    expect(totalValue('Tax (18%)')).toBe('$7.20');
    expect(totalValue('Total')).toBe('$47.18');
    expect(screen.getByRole('link', { name: 'Cart (2) · $47.18' })).toHaveAttribute(
      'href',
      '#cart-heading',
    );
  });

  it('never lets the quantity exceed stock and keeps focus on the limit button', async () => {
    const user = userEvent.setup();
    render(<CartPage />);

    await user.click(await screen.findByRole('button', { name: 'Add Mascara to cart' }));
    const increase = screen.getByRole('button', { name: 'Increase quantity of Mascara' });
    await user.click(increase);
    await user.click(increase);
    await user.click(increase);

    expect(increase).toHaveAttribute('aria-disabled', 'true');
    expect(increase).toHaveFocus();
    expect(increase).toHaveAccessibleDescription('Maximum stock reached');
    expect(screen.getByRole('button', { name: 'Add Mascara to cart' })).toHaveTextContent(
      'Max in cart',
    );
    expect(totalValue('Subtotal')).toBe('$59.97');
  });

  it('labels a zero-stock product as out of stock', async () => {
    render(<CartPage />);

    const add = await screen.findByRole('button', { name: 'Add Perfume to cart' });
    expect(add).toHaveTextContent('Out of stock');
    expect(add).toHaveAttribute('aria-disabled', 'true');
  });

  it('persists a cart built through the UI across a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CartPage />);
    await user.click(await screen.findByRole('button', { name: 'Add Lipstick to cart' }));
    unmount();

    render(<CartPage />);

    expect(
      await screen.findByRole('button', { name: 'Remove Lipstick from cart' }),
    ).toBeInTheDocument();
    expect(totalValue('Subtotal')).toBe('$9.99');
  });

  it('restores a saved cart, shows unavailable lines and moves focus on remove', async () => {
    saveToStorage('cart', 1, [
      { productId: 2, quantity: 2 },
      { productId: 99, quantity: 1 },
    ]);
    const user = userEvent.setup();
    render(<CartPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Remove Unavailable item from cart' }),
    );
    expect(totalValue('Subtotal')).toBe('$19.98');

    await user.click(screen.getByRole('button', { name: 'Remove Lipstick from cart' }));

    const cart = screen.getByRole('complementary', { name: 'Your cart' });
    expect(within(cart).getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Removed Lipstick. Your cart is empty');
    expect(screen.getByRole('heading', { name: 'Your cart' })).toHaveFocus();
  });

  it('does not show a saved cart as empty when products fail, and retries', async () => {
    saveToStorage('cart', 1, [{ productId: 1, quantity: 1 }]);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    render(<CartPage />);

    expect(
      await screen.findByText("Can't show your cart until products load."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/your cart is empty/i)).not.toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry loading products' }));

    expect(
      await screen.findByRole('button', { name: 'Remove Mascara from cart' }),
    ).toBeInTheDocument();
    expect(totalValue('Total')).toBe('$23.59');
  });
});
