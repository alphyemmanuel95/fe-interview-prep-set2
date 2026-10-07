import type { JSX, Ref, SubmitEvent } from 'react';
import { useId, useState } from 'react';
import './CommentForm.css';

export const MAX_COMMENT_LENGTH = 500;

export type CommentFormProps = Readonly<{
  onPost: (text: string) => void;
  textareaRef: Ref<HTMLTextAreaElement>;
}>;

export function CommentForm({ onPost, textareaRef }: CommentFormProps): JSX.Element {
  const [draft, setDraft] = useState('');
  const textareaId = useId();
  const hintId = useId();
  const trimmed = draft.trim();
  const canPost = trimmed !== '';

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canPost) {
      return;
    }
    onPost(trimmed);
    setDraft('');
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <label className="comment-form__label" htmlFor={textareaId}>
        Add a comment
      </label>
      <textarea
        ref={textareaRef}
        id={textareaId}
        className="comment-form__input"
        rows={3}
        maxLength={MAX_COMMENT_LENGTH}
        value={draft}
        aria-describedby={hintId}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
      <div className="comment-form__footer">
        <p id={hintId} className="comment-form__hint">
          {draft.length}/{MAX_COMMENT_LENGTH} characters. Works offline — comments are queued.
        </p>
        <button type="submit" className="comment-form__submit" disabled={!canPost}>
          Post
        </button>
      </div>
    </form>
  );
}
