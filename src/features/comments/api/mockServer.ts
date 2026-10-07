// In-memory stand-in for a comments backend: slow (1–2 s) and unreliable (~20% failures).
// Randomness and latency are injectable so tests can make every outcome deterministic.

export const FAILURE_RATE = 0.2;
export const MIN_LATENCY_MS = 1_000;
export const MAX_LATENCY_MS = 2_000;

export type NewComment = Readonly<{ clientId: string; text: string; createdAt: string }>;

export type ServerComment = Readonly<{
  id: string;
  clientId: string;
  text: string;
  createdAt: string;
}>;

export type CommentsApi = Readonly<{
  getComments: (signal?: AbortSignal) => Promise<readonly ServerComment[]>;
  postComment: (comment: NewComment, signal?: AbortSignal) => Promise<ServerComment>;
}>;

export type MockCommentsServer = CommentsApi &
  Readonly<{
    /** Synchronous view of what the "server" has stored — for tests and debugging. */
    snapshot: () => readonly ServerComment[];
  }>;

export type Delay = (ms: number, signal?: AbortSignal) => Promise<void>;

export type MockServerOptions = Readonly<{
  random: () => number;
  delay: Delay;
  failureRate: number;
  /** Reads never fail by default; tests and demos can opt in. */
  historyFailureRate: number;
  seed: readonly ServerComment[];
}>;

export const SEED_COMMENTS: readonly ServerComment[] = [
  {
    id: 'server-1',
    clientId: 'seed-1',
    text: 'Great write-up — the section on idempotency keys cleared things up for me.',
    createdAt: '2026-10-07T08:15:00.000Z',
  },
  {
    id: 'server-2',
    clientId: 'seed-2',
    text: 'Does the queue survive closing the tab? Asking for a flaky train Wi-Fi friend.',
    createdAt: '2026-10-07T08:42:00.000Z',
  },
];

const abortError = (): DOMException => new DOMException('Request aborted', 'AbortError');

export const sleep: Delay = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(abortError());
      return;
    }
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
    function handleAbort(): void {
      clearTimeout(timeoutId);
      reject(abortError());
    }
    signal?.addEventListener('abort', handleAbort, { once: true });
  });

export function createMockServer(options: Partial<MockServerOptions> = {}): MockCommentsServer {
  const {
    random = Math.random,
    delay = sleep,
    failureRate = FAILURE_RATE,
    historyFailureRate = 0,
    seed = SEED_COMMENTS,
  } = options;
  // A Map keeps insertion order (= server order) and makes `clientId` a unique key.
  const store = new Map<string, ServerComment>(seed.map((comment) => [comment.clientId, comment]));
  let nextId = store.size + 1;

  const latency = (): number => MIN_LATENCY_MS + random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);

  const commit = (comment: NewComment): ServerComment => {
    // `clientId` acts as an idempotency key: a retry of a request the server already processed
    // returns the original record instead of inserting a duplicate. A real API should do the same.
    const existing = store.get(comment.clientId);
    if (existing !== undefined) {
      return existing;
    }
    const saved: ServerComment = { ...comment, id: `server-${nextId}` };
    nextId += 1;
    store.set(comment.clientId, saved);
    return saved;
  };

  return {
    snapshot: () => [...store.values()],

    getComments: async (signal) => {
      await delay(latency(), signal);
      if (random() < historyFailureRate) {
        throw new Error('Could not load comments');
      }
      return [...store.values()];
    },

    postComment: async (comment, signal) => {
      await delay(latency(), signal);
      const roll = random();
      if (roll < failureRate / 2) {
        throw new Error('Server unavailable');
      }
      const saved = commit(comment);
      if (roll < failureRate) {
        // "Lost response": the write succeeded but the client never hears back. Only the
        // idempotency key keeps the client's retry from creating a second copy.
        throw new Error('Connection reset before the response arrived');
      }
      return saved;
    },
  };
}

export const commentsApi: CommentsApi = createMockServer();
