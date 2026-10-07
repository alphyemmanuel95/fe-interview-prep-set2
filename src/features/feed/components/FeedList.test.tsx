import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, Link, MemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from '../../../app/Layout';
import { FeedPage } from '../FeedPage';
import { initialFeedState } from '../model/feedReducer';
import { createFeedStore } from '../model/feedStore';
import { FeedList } from './FeedList';

const TOTAL_POSTS = 25;
const SAVED_SCROLL_Y = 1234;

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
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent("Couldn't load posts. Check your connection and try again.");
    expect(status).not.toContainElement(retryButton);

    scrollSentinelIntoView(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(retryButton);
    expect(await screen.findByRole('link', { name: 'Post 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(status.parentElement).toHaveFocus();
    expect(requestedSkips()).toEqual(['0', '0']);
  });

  it('restores the scroll position and keeps loaded posts when going back', async () => {
    const user = userEvent.setup();
    // jsdom does not lay out or scroll, so the test stands in for the browser's scroll APIs.
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    const scrollY = vi.spyOn(window, 'scrollY', 'get');
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <Layout />,
          children: [{ path: 'feed/*', element: <FeedPage store={createFeedStore()} /> }],
        },
      ],
      { initialEntries: ['/feed'] },
    );
    render(<RouterProvider router={router} />);

    scrollSentinelIntoView(1);
    const postLink = await screen.findByRole('link', { name: 'Post 3' });
    scrollY.mockReturnValue(SAVED_SCROLL_Y);
    await user.click(postLink);
    expect(screen.getByRole('heading', { level: 1, name: 'Post 3' })).toBeInTheDocument();

    scrollY.mockReturnValue(0);
    scrollTo.mockClear();
    await user.click(screen.getByRole('link', { name: /Back to feed/ }));
    expect(await screen.findByRole('link', { name: 'Post 10' })).toBeInTheDocument();
    expect(router.state.historyAction).toBe('POP');
    expect(scrollTo).toHaveBeenCalledWith(0, SAVED_SCROLL_Y);
    expect(screen.getByRole('link', { name: 'Post 3' })).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh feed when /feed is opened by a link (PUSH)', async () => {
    const user = userEvent.setup();
    const store = createFeedStore({
      ...initialFeedState,
      posts: [
        {
          id: 99,
          title: 'Stale post',
          body: 'Old',
          tags: [],
          likes: 0,
          dislikes: 0,
          views: 0,
        },
      ],
      nextSkip: 10,
    });
    const router = createMemoryRouter(
      [
        { path: '/', element: <Link to="/feed">Open feed</Link> },
        { path: '/feed/*', element: <FeedPage store={store} /> },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);

    await user.click(screen.getByRole('link', { name: 'Open feed' }));
    expect(screen.queryByRole('link', { name: 'Stale post' })).not.toBeInTheDocument();

    scrollSentinelIntoView(1);
    expect(await screen.findByRole('link', { name: 'Post 1' })).toBeInTheDocument();
    expect(requestedSkips()).toEqual(['0']);
  });

  it('aborts the pending request on unmount and leaves the store idle', async () => {
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            requestSignal = init.signal ?? undefined;
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      ),
    );
    const store = createFeedStore();
    const { unmount } = render(
      <MemoryRouter initialEntries={['/feed']}>
        <FeedList store={store} />
      </MemoryRouter>,
    );

    scrollSentinelIntoView(1);
    expect(store.getState().phase).toEqual({ status: 'loading' });

    unmount();
    expect(requestSignal?.aborted).toBe(true);
    await waitFor(() => {
      expect(store.getState().phase).toEqual({ status: 'idle' });
    });
  });
});
