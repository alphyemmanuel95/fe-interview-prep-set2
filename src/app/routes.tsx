import type { RouteObject } from 'react-router';
import { CartPage } from '../features/cart/CartPage';
import { CommentsPage } from '../features/comments/CommentsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { FeedPage } from '../features/feed/FeedPage';
import { KanbanPage } from '../features/kanban/KanbanPage';
import { HomePage } from './HomePage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

// Each feature owns everything below its path (e.g. `feed/*` for the post detail route),
// so feature branches never need to edit this shared file.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cart/*', element: <CartPage /> },
      { path: 'feed/*', element: <FeedPage /> },
      { path: 'kanban/*', element: <KanbanPage /> },
      { path: 'dashboard/*', element: <DashboardPage /> },
      { path: 'comments/*', element: <CommentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
