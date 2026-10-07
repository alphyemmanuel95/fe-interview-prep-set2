import type { JSX } from 'react';
import type { Post } from '../model/post';
import './PostMeta.css';

type PostMetaProps = Readonly<{ post: Post }>;

const countFormat = new Intl.NumberFormat('en');

export function PostMeta({ post }: PostMetaProps): JSX.Element {
  return (
    <div className="post-meta">
      <ul className="post-meta__tags" aria-label="Tags">
        {post.tags.map((tag) => (
          <li key={tag} className="post-meta__tag">
            #{tag}
          </li>
        ))}
      </ul>
      <p className="post-meta__stats">
        {countFormat.format(post.likes)} likes · {countFormat.format(post.dislikes)} dislikes ·{' '}
        {countFormat.format(post.views)} views
      </p>
    </div>
  );
}
