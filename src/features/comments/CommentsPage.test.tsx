import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommentsApi, MockCommentsServer } from './api/mockServer';
import { createMockServer } from './api/mockServer';
import { CommentsPage } from './CommentsPage';

const instant = (): Promise<void> => Promise.resolve();
const createReliableServer = (): MockCommentsServer =>
  createMockServer({ delay: instant, failureRate: 0, seed: [] });

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

describe('CommentsPage', () => {
  it('queues comments offline and sends all of them in order, once, when back online', async () => {
    const user = userEvent.setup();
    const server = createReliableServer();
    onLine.mockReturnValue(false);
    render(
      <StrictMode>
        <CommentsPage api={server} />
      </StrictMode>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    await post(user, 'First');
    await post(user, 'Second');
    await post(user, 'Third');

    expect(within(thread()).getAllByText('Queued')).toHaveLength(3);
    expect(server.snapshot()).toEqual([]);

    setConnection(true);

    await waitFor(() => {
      expect(within(thread()).getAllByText('Sent')).toHaveLength(3);
    });
    const stored = server.snapshot();
    expect(stored.map((comment) => comment.text)).toEqual(['First', 'Second', 'Third']);
    expect(new Set(stored.map((comment) => comment.clientId)).size).toBe(3);
  });

  it('keeps a failed comment visible and retries it without creating a duplicate', async () => {
    const user = userEvent.setup();
    const server = createReliableServer();
    let shouldLoseResponse = true;
    const postComment = vi.fn<CommentsApi['postComment']>(async (comment, signal) => {
      const saved = await server.postComment(comment, signal);
      if (shouldLoseResponse) {
        // The server stored the comment but the client never hears back.
        shouldLoseResponse = false;
        throw new Error('Connection reset');
      }
      return saved;
    });
    render(<CommentsPage api={{ getComments: server.getComments, postComment }} />);

    await post(user, 'Hello there');

    const retry = await screen.findByRole('button', { name: 'Retry sending "Hello there"' });
    expect(within(thread()).getByText('Failed to send')).toBeInTheDocument();

    await user.click(retry);

    await waitFor(() => {
      expect(within(thread()).getByText('Sent')).toBeInTheDocument();
    });
    expect(postComment).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = postComment.mock.calls;
    expect(secondCall?.[0].clientId).toBe(firstCall?.[0].clientId);
    expect(server.snapshot().map((comment) => comment.text)).toEqual(['Hello there']);
    expect(screen.getByLabelText('Add a comment')).toHaveFocus();
  });

  it('restores queued comments after a reload and sends them when online', async () => {
    const user = userEvent.setup();
    const server = createReliableServer();
    onLine.mockReturnValue(false);
    const { unmount } = render(<CommentsPage api={server} />);

    await post(user, 'Written on the train');
    await post(user, 'Still no signal');
    unmount();

    render(<CommentsPage api={server} />);

    expect(within(thread()).getAllByText('Queued')).toHaveLength(2);
    expect(within(thread()).getByText('Written on the train')).toBeInTheDocument();

    setConnection(true);

    await waitFor(() => {
      expect(server.snapshot().map((comment) => comment.text)).toEqual([
        'Written on the train',
        'Still no signal',
      ]);
    });
  });
});
