import type { JSX } from 'react';
import { Link } from 'react-router';
import type { Post } from '../model/post';
import { feedLocationState } from '../model/navigation';
import { PostMeta } from './PostMeta';
import './PostCard.css';

type PostCardProps = Readonly<{ post: Post }>;

export function PostCard({ post }: PostCardProps): JSX.Element {
  return (
    <article className="post-card">
      <h2 className="post-card__title">
        <Link to={String(post.id)} state={feedLocationState} className="post-card__link">
          {post.title}
        </Link>
      </h2>
      <p className="post-card__excerpt">{post.body}</p>
      <PostMeta post={post} />
    </article>
  );
}
