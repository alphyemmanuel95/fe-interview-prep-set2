import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedPage } from '../FeedPage';
import { createFeedStore } from '../model/feedStore';
import { FeedList } from './FeedList';

const TOTAL_POSTS = 25;

type ObserverCallback = (entries: readonly { isIntersecting: boolean }[]) => void;

const activeObservers = new Set<FakeIntersectionObserver>();

// jsdom has no IntersectionObserver; this fake lets the test decide when the sentinel is "visible".
class FakeIntersectionObserver {
  readonly callback: ObserverCallback;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
  }

  observe(): void {
    activeObservers.add(this);
  }

  disconnect(): void {
    activeObservers.delete(this);
  }
}

function scrollSentinelIntoView(times: number): void {
  act(() => {
    for (let index = 0; index < times; index += 1) {
      [...activeObservers].forEach((observer) => {
        observer.callback([{ isIntersecting: true }]);
      });
    }
  });
}

function postsPageBody(skip: number): string {
  const count = Math.max(0, Math.min(10, TOTAL_POSTS - skip));
  const posts = Array.from({ length: count }, (_, offset) => {
    const id = skip + offset + 1;
    return {
      id,
      title: `Post ${id}`,
      body: `Body of post ${id}`,
      tags: ['news'],
      reactions: { likes: 1, dislikes: 0 },
      views: 10,
    };
  });
  return JSON.stringify({ posts, total: TOTAL_POSTS, skip, limit: count });
}

function okResponse(url: string): Response {
  const skip = Number(new URL(url).searchParams.get('skip'));
  return new Response(postsPageBody(skip), { status: 200 });
}

const fetchMock = vi.fn((url: string) => Promise.resolve(okResponse(url)));

function requestedSkips(): readonly string[] {
  return fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get('skip') ?? '');
}

function renderFeed(): void {
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/feed']}>
        <FeedList store={createFeedStore()} />
      </MemoryRouter>
    </StrictMode>,
  );
}

beforeEach(() => {
  activeObservers.clear();
  fetchMock.mockClear();
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('fetch', fetchMock);
});

describe('FeedList', () => {
  it('requests each page exactly once however often the sentinel fires', async () => {
    renderFeed();

    scrollSentinelIntoView(5);
    expect(await screen.findByRole('link', { name: 'Post 10' })).toBeInTheDocument();

    scrollSentinelIntoView(5);
    expect(await screen.findByRole('link', { name: 'Post 20' })).toBeInTheDocument();

    scrollSentinelIntoView(5);
    expect(await screen.findByText("You've reached the end")).toBeInTheDocument();

    scrollSentinelIntoView(5);
    expect(requestedSkips()).toEqual(['0', '10', '20']);
    const titles = screen.getAllByRole('link').map((link) => link.textContent);
    expect(titles).toHaveLength(TOTAL_POSTS);
    expect(new Set(titles).size).toBe(TOTAL_POSTS);
  });

  it('shows an error with a working Retry and does not auto-retry on scroll', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(new Response('Server error', { status: 500 })),
    );
    renderFeed();

    scrollSentinelIntoView(1);
    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText(/Could not load posts/)).toBeInTheDocument();

    scrollSentinelIntoView(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(retryButton);
    expect(await screen.findByRole('link', { name: 'Post 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(requestedSkips()).toEqual(['0', '0']);
  });

  it('keeps loaded posts when returning from a post without refetching', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [{ path: '/feed/*', element: <FeedPage store={createFeedStore()} /> }],
      {
        initialEntries: ['/feed'],
      },
    );
    render(<RouterProvider router={router} />);

    scrollSentinelIntoView(1);
    await user.click(await screen.findByRole('link', { name: 'Post 3' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Post 3' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Back to feed/ }));
    expect(await screen.findByRole('link', { name: 'Post 10' })).toBeInTheDocument();
    expect(router.state.historyAction).toBe('POP');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
