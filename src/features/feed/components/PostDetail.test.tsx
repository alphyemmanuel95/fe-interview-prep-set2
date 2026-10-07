import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedPage } from '../FeedPage';
import { createFeedStore } from '../model/feedStore';
import { feedLocationState } from '../model/navigation';

const POST_BODY = JSON.stringify({
  id: 7,
  title: 'Deep linked post',
  body: 'Full body',
  tags: ['news'],
  reactions: { likes: 2, dislikes: 1 },
  views: 30,
});

const fetchMock = vi.fn<(url: string) => Promise<Response>>();

function renderAt(entry: string | { pathname: string; state: unknown }) {
  const router = createMemoryRouter(
    [{ path: '/feed/*', element: <FeedPage store={createFeedStore()} /> }],
    { initialEntries: ['/feed', entry], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});

describe('PostDetail', () => {
  it('shows a focused not-found heading without Retry for a 404', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));
    renderAt('/feed/9999');

    const heading = await screen.findByRole('heading', { level: 1, name: 'Post not found' });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Post not found');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('announces a failure and recovers through Retry', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response(POST_BODY, { status: 200 }));
    renderAt('/feed/7');

    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByRole('status')).toHaveTextContent(
      "Couldn't load this post. Check your connection and try again.",
    );
    await user.click(retryButton);

    const heading = await screen.findByRole('heading', { level: 1, name: 'Deep linked post' });
    expect(heading).toHaveFocus();
    expect(document.title).toBe('Deep linked post · Infinite Feed');
  });

  it('pushes /feed from Back when the feed is no longer in memory', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(POST_BODY, { status: 200 }));
    const router = renderAt({ pathname: '/feed/7', state: feedLocationState });

    await screen.findByRole('heading', { level: 1, name: 'Deep linked post' });
    await user.click(screen.getByRole('link', { name: 'Back to feed' }));

    expect(router.state.location.pathname).toBe('/feed');
    expect(router.state.historyAction).toBe('PUSH');
  });
});
