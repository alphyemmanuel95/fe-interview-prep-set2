import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommentsApi, MockCommentsServer, ServerComment } from './api/mockServer';
import { createMockServer } from './api/mockServer';
import { CommentsPage } from './CommentsPage';

const BLOCKED = 'Queued — waiting for the failed comment above';
const QUEUED_OFFLINE = 'Queued (offline)';

/** What the next POST does: succeed, fail before storing, store but lose the response, or hang. */
type CallPlan = 'succeed' | 'fail' | 'lose-response' | 'hang';

type Harness = Readonly<{
  server: MockCommentsServer;
  api: CommentsApi;
  postComment: ReturnType<typeof vi.fn<CommentsApi['postComment']>>;
  postedTexts: () => string[];
  postedClientIds: () => string[];
}>;

const instant = (): Promise<void> => Promise.resolve();

const hangUntilAborted = (signal: AbortSignal | undefined): Promise<never> =>
  new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

function createHarness(plans: CallPlan[] = [], seed: readonly ServerComment[] = []): Harness {
  const server = createMockServer({ delay: instant, failureRate: 0, seed });
  const postComment = vi.fn<CommentsApi['postComment']>(async (comment, signal) => {
    const plan = plans.shift() ?? 'succeed';
    if (plan === 'hang') {
      return hangUntilAborted(signal);
    }
    if (plan === 'fail') {
      throw new Error('Server unavailable');
    }
    const saved = await server.postComment(comment, signal);
    if (plan === 'lose-response') {
      throw new Error('Connection reset');
    }
    return saved;
  });
  return {
    server,
    api: { getComments: server.getComments, postComment },
    postComment,
    postedTexts: () => postComment.mock.calls.map(([comment]) => comment.text),
    postedClientIds: () => postComment.mock.calls.map(([comment]) => comment.clientId),
  };
}

const storedTexts = (server: MockCommentsServer): string[] =>
  server.snapshot().map((comment) => comment.text);

let onLine: MockInstance<() => boolean>;

beforeEach(() => {
  onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

function setConnection(isOnline: boolean): void {
  onLine.mockReturnValue(isOnline);
  act(() => {
    window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
  });
}

async function post(user: ReturnType<typeof userEvent.setup>, text: string): Promise<void> {
  await user.type(screen.getByLabelText('Add a comment'), text);
  await user.click(screen.getByRole('button', { name: 'Post' }));
}

const thread = (): HTMLElement => screen.getByRole('list', { name: 'Comment thread' });

async function postOffline(...texts: string[]): Promise<void> {
  const user = userEvent.setup();
  setConnection(false);
  for (const text of texts) {
    await post(user, text);
  }
}

describe('CommentsPage', () => {
  it('queues comments offline and sends each exactly once, in order, when back online', async () => {
    const harness = createHarness();
    render(
      <StrictMode>
        <CommentsPage api={harness.api} />
      </StrictMode>,
    );

    await postOffline('First', 'Second', 'Third');

    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    expect(within(thread()).getAllByText(QUEUED_OFFLINE)).toHaveLength(3);
    expect(harness.postComment).not.toHaveBeenCalled();

    setConnection(true);

    await waitFor(() => {
      expect(within(thread()).getAllByText('Sent')).toHaveLength(3);
    });
    // Asserted on the calls, not just the server, so a double POST (e.g. under StrictMode)
    // fails here even though the idempotent server would hide it.
    expect(harness.postedTexts()).toEqual(['First', 'Second', 'Third']);
    expect(new Set(harness.postedClientIds()).size).toBe(3);
    expect(storedTexts(harness.server)).toEqual(['First', 'Second', 'Third']);
  });

  it('holds the queue behind a failed head and keeps order after Retry', async () => {
    const user = userEvent.setup();
    const harness = createHarness(['fail']);
    render(<CommentsPage api={harness.api} />);
    await postOffline('A', 'B', 'C');

    setConnection(true);

    const retry = await screen.findByRole('button', { name: 'Retry sending "A"' });
    expect(within(thread()).getByText('Failed to send')).toBeInTheDocument();
    expect(within(thread()).getAllByText(BLOCKED)).toHaveLength(2);
    expect(screen.getByText('Comment failed to send: "A"')).toBeInTheDocument();
    expect(harness.postComment).toHaveBeenCalledTimes(1);
    expect(harness.server.snapshot()).toEqual([]);

    await user.click(retry);

    await waitFor(() => {
      expect(within(thread()).getAllByText('Sent')).toHaveLength(3);
    });
    expect(harness.postedTexts()).toEqual(['A', 'A', 'B', 'C']);
    expect(storedTexts(harness.server)).toEqual(['A', 'B', 'C']);
    expect(within(thread()).getAllByRole('listitem')[0]).toHaveFocus();
  });

  it('retries a lost response with the same clientId without duplicating it', async () => {
    const user = userEvent.setup();
    const harness = createHarness(['lose-response']);
    render(<CommentsPage api={harness.api} />);
    await postOffline('A', 'B', 'C');

    setConnection(true);
    await user.click(await screen.findByRole('button', { name: 'Retry sending "A"' }));

    await waitFor(() => {
      expect(storedTexts(harness.server)).toEqual(['A', 'B', 'C']);
    });
    const [firstAttempt, retryAttempt] = harness.postedClientIds();
    expect(retryAttempt).toBe(firstAttempt);
    expect(harness.postedTexts()).toEqual(['A', 'A', 'B', 'C']);
  });

  it('aborts the request when going offline mid-send and resends it once on reconnect', async () => {
    const user = userEvent.setup();
    const harness = createHarness(['hang']);
    render(<CommentsPage api={harness.api} />);

    await post(user, 'Flaky tunnel');
    expect(harness.postComment).toHaveBeenCalledTimes(1);
    const firstSignal = harness.postComment.mock.calls[0]?.[1];
    expect(firstSignal?.aborted).toBe(false);

    setConnection(false);

    expect(firstSignal?.aborted).toBe(true);
    expect(await within(thread()).findByText(QUEUED_OFFLINE)).toBeInTheDocument();

    setConnection(true);

    expect(await within(thread()).findByText('Sent')).toBeInTheDocument();
    expect(harness.postComment).toHaveBeenCalledTimes(2);
    expect(storedTexts(harness.server)).toEqual(['Flaky tunnel']);
  });

  it('restores queued comments after a reload and sends them when online', async () => {
    const harness = createHarness();
    const { unmount } = render(<CommentsPage api={harness.api} />);
    await postOffline('Written on the train', 'Still no signal');
    unmount();

    render(<CommentsPage api={harness.api} />);

    expect(within(thread()).getAllByText(QUEUED_OFFLINE)).toHaveLength(2);
    expect(within(thread()).getByText('Written on the train')).toBeInTheDocument();

    setConnection(true);

    await waitFor(() => {
      expect(storedTexts(harness.server)).toEqual(['Written on the train', 'Still no signal']);
    });
  });

  it('shows a retryable error when history fails to load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const harness = createHarness(
      [],
      [{ id: 's-1', clientId: 'seed', text: 'From the server', createdAt: '2026-10-07T08:00:00Z' }],
    );
    const getComments = vi
      .fn<CommentsApi['getComments']>(harness.server.getComments)
      .mockRejectedValueOnce(new Error('Could not load comments'));
    render(<CommentsPage api={{ ...harness.api, getComments }} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load earlier comments.');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await within(thread()).findByText('From the server')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(within(thread()).queryByText('Sent')).not.toBeInTheDocument();
  });
});
