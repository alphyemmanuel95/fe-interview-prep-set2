const SNIPPET_LENGTH = 30;

export const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

export const snippet = (text: string): string =>
  text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
