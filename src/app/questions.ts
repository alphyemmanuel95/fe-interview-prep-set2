export type Question = Readonly<{
  number: number;
  title: string;
  path: string;
  summary: string;
}>;

export const QUESTIONS = [
  {
    number: 1,
    title: 'Shopping Cart',
    path: '/cart',
    summary: 'Products, quantities, tax and a persisted cart.',
  },
  {
    number: 2,
    title: 'Infinite Feed',
    path: '/feed',
    summary: 'Paginated posts with scroll restoration.',
  },
  {
    number: 3,
    title: 'Kanban Board',
    path: '/kanban',
    summary: 'Drag-and-drop and keyboard-accessible task board.',
  },
  {
    number: 4,
    title: 'Live Dashboard',
    path: '/dashboard',
    summary: 'Polling widgets that pause while the tab is hidden.',
  },
  {
    number: 5,
    title: 'Comments',
    path: '/comments',
    summary: 'Optimistic comments with an offline queue.',
  },
] as const satisfies readonly Question[];
