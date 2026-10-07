import { describe, expect, it, vi } from 'vitest';
import { fetchPostsPage } from './postsApi';

const validPost = {
  id: 1,
  title: 'Valid',
  body: 'Body',
  tags: ['news'],
  reactions: { likes: 1, dislikes: 0 },
  views: 3,
};

describe('fetchPostsPage', () => {
  it('drops malformed posts but still counts them for the skip cursor', async () => {
    const body = JSON.stringify({
      posts: [validPost, { id: 2, title: null }],
      total: 30,
      skip: 10,
      limit: 2,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(body, { status: 200 }))),
    );

    const page = await fetchPostsPage(10, new AbortController().signal);

    expect(page.posts.map((post) => post.id)).toEqual([1]);
    expect(page.itemCount).toBe(2);
    expect(page.skip).toBe(10);
  });
});
