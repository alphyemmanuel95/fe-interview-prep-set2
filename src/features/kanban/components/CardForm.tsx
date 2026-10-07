import type { JSX, SyntheticEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CardDraft } from '../model/board';
import './CardForm.css';

type CardFormProps = Readonly<{
  label: string;
  submitLabel: string;
  initialDraft?: CardDraft;
  shouldAutoFocus?: boolean;
  onSubmit: (draft: CardDraft) => void;
  onCancel?: () => void;
}>;

const EMPTY_DRAFT: CardDraft = { title: '', description: '' };

/** Shared by "add card" and "edit card": owns the draft, trims input and validates the title. */
export function CardForm({
  label,
  submitLabel,
  initialDraft = EMPTY_DRAFT,
  shouldAutoFocus = false,
  onSubmit,
  onCancel,
}: CardFormProps): JSX.Element {
  const id = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialDraft.title);
  const [description, setDescription] = useState(initialDraft.description);
  const [hasTitleError, setHasTitleError] = useState(false);

  // Mount-only: the inline editor takes focus when the user opens it (instead of autoFocus).
  useEffect(() => {
    if (shouldAutoFocus) {
      titleRef.current?.focus();
    }
  }, [shouldAutoFocus]);

  const titleId = `${id}-title`;
  const errorId = `${id}-title-error`;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle === '') {
      setHasTitleError(true);
      titleRef.current?.focus();
      return;
    }
    onSubmit({ title: trimmedTitle, description: description.trim() });
    setHasTitleError(false);
    setTitle(initialDraft.title);
    setDescription(initialDraft.description);
  };

  return (
    <form className="card-form" aria-label={label} noValidate onSubmit={handleSubmit}>
      <label className="card-form__label" htmlFor={titleId}>
        Title <span aria-hidden="true">*</span>
      </label>
      <input
        ref={titleRef}
        id={titleId}
        className="card-form__input"
        value={title}
        required
        aria-invalid={hasTitleError}
        aria-describedby={hasTitleError ? errorId : undefined}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
      />
      {hasTitleError && (
        <p id={errorId} className="card-form__error">
          Title is required.
        </p>
      )}
      <label className="card-form__label" htmlFor={`${id}-description`}>
        Description (optional)
      </label>
      <textarea
        id={`${id}-description`}
        className="card-form__input card-form__textarea"
        value={description}
        rows={2}
        onChange={(event) => {
          setDescription(event.target.value);
        }}
      />
      <div className="card-form__actions">
        <button type="submit" className="card-form__button card-form__button--primary">
          {submitLabel}
        </button>
        {onCancel !== undefined && (
          <button type="button" className="card-form__button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
