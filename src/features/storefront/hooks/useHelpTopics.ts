// useHelpTopics: the topics the help articles already use, read once for the topic menu of the New article form. The Help centre table is
// a filtered, paged list, so it cannot say which topics exist; this reads the whole list (up to the cap) without a filter.
import { useMemo } from 'react';
import { WHOLE_LIST_CAP } from '../lib/views';
import { topicsOf } from '../lib/help';
import type { HelpArticle } from '../types';
import { useStorefrontList } from './useStorefrontList';

/** The topics in use, sorted, once the articles are read (`ready`); an empty list while loading or when the read fails. */
export function useHelpTopics(): { topics: string[]; ready: boolean; loading: boolean } {
  const list = useStorefrontList<HelpArticle>('help-articles', {
    filters: [],
    page: 1,
    pageSize: WHOLE_LIST_CAP,
  });
  const topics = useMemo(() => topicsOf(list.rows), [list.rows]);
  return { topics, ready: list.query.isSuccess, loading: list.query.isLoading };
}
