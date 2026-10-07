export type Post = Readonly<{
  id: number;
  title: string;
  body: string;
  tags: readonly string[];
  likes: number;
  dislikes: number;
  views: number;
}>;

export type PostsPage = Readonly<{
  posts: readonly Post[];
  total: number;
  skip: number;
  /** Items the server sent, before malformed ones were dropped; drives the skip cursor. */
  itemCount: number;
}>;

export function parsePostId(value: string | undefined): number | null {
  const postId = Number(value);
  return Number.isInteger(postId) && postId > 0 ? postId : null;
}
