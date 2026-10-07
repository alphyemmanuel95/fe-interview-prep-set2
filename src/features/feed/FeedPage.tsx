import type { JSX } from 'react';
import { Route, Routes } from 'react-router';
import { FeedList } from './components/FeedList';
import { feedStore } from './model/feedStore';

export function FeedPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<FeedList store={feedStore} />} />
    </Routes>
  );
}
