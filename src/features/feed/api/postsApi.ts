import type { Post, PostsPage } from '../model/post';

const POSTS_URL = 'https://dummyjson.com/posts';
export const PAGE_SIZE = 10;

type UnknownRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

// The API is an untrusted boundary: everything stays `unknown` until it is narrowed here,
// so a shape change fails loudly as an error state instead of rendering `undefined`.
function parsePost(value: unknown): Post | null {
  if (!isRecord(value) || !isRecord(value['reactions'])) {
    return null;
  }
  const { id, title, body, tags, views } = value;
  const { likes, dislikes } = value['reactions'];
  if (
    typeof id !== 'number' ||
    typeof title !== 'string' ||
    typeof body !== 'string' ||
    !isStringArray(tags) ||
    typeof views !== 'number' ||
    typeof likes !== 'number' ||
    typeof dislikes !== 'number'
  ) {
    return null;
  }
  return { id, title, body, tags, views, likes, dislikes };
}

function parsePostsPage(value: unknown): PostsPage | null {
  if (!isRecord(value) || !Array.isArray(value['posts'])) {
    return null;
  }
  const { total, skip } = value;
  if (typeof total !== 'number' || typeof skip !== 'number') {
    return null;
  }
  const posts: Post[] = [];
  for (const item of value['posts']) {
    const post = parsePost(item);
    if (!post) {
      return null;
    }
    posts.push(post);
  }
  return { posts, total, skip };
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchPostsPage(skip: number, signal: AbortSignal): Promise<PostsPage> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
  const page = parsePostsPage(await fetchJson(`${POSTS_URL}?${params.toString()}`, signal));
  if (!page) {
    throw new Error('Unexpected posts response');
  }
  return page;
}

export async function fetchPost(postId: number, signal: AbortSignal): Promise<Post> {
  const post = parsePost(await fetchJson(`${POSTS_URL}/${postId}`, signal));
  if (!post) {
    throw new Error('Unexpected post response');
  }
  return post;
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
