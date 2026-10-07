import { describe, expect, it } from 'vitest';
import { createMockServer } from './mockServer';

const instant = (): Promise<void> => Promise.resolve();
const comment = { clientId: 'c-1', text: 'Hello', createdAt: '2026-10-07T10:00:00.000Z' };

describe('createMockServer', () => {
  it('stores a comment once per clientId, however often it is posted', async () => {
    const server = createMockServer({ delay: instant, failureRate: 0, seed: [] });

    const first = await server.postComment(comment);
    const second = await server.postComment(comment);

    expect(second).toEqual(first);
    expect(server.snapshot()).toEqual([first]);
  });

  it('can fail after committing, and a retry returns the stored record', async () => {
    // Rolls: latency, outcome (0.15 → commit then fail), latency, outcome (0.9 → success).
    const rolls = [0, 0.15, 0, 0.9];
    const server = createMockServer({
      delay: instant,
      random: () => rolls.shift() ?? 0.9,
      seed: [],
    });

    await expect(server.postComment(comment)).rejects.toThrow();
    expect(server.snapshot()).toHaveLength(1);

    await server.postComment(comment);
    expect(server.snapshot()).toHaveLength(1);
  });

  it('fails before committing on a low roll', async () => {
    const server = createMockServer({ delay: instant, random: () => 0, seed: [] });

    await expect(server.postComment(comment)).rejects.toThrow('Server unavailable');
    expect(server.snapshot()).toEqual([]);
  });
});
