// The IP rules of one kind as a Refine list. Allowed addresses and blocks are asked for separately, so a long list of
// automatic blocks never pushes out the short list of allowed offices.
import { useList } from '@refinedev/core';
import { useMemo } from 'react';
import { useNow } from '@/lib/format';
import { liveRules } from '../lib/ipRules';
import type { IpRule, IpRuleKind } from '../types';

/** Most rules one list loads (the newest first). If the server has more, the screen says so. */
export const IP_RULE_CAP = 500;

/** The rules of a kind, with the total the server counted. */
export function useIpRules(kind: IpRuleKind, options: { enabled?: boolean } = {}) {
  const { result, query } = useList<IpRule>({
    resource: 'ip-rules',
    pagination: { currentPage: 1, pageSize: IP_RULE_CAP },
    filters: [{ field: 'kind', operator: 'eq', value: kind }],
    sorters: [{ field: 'createdAt', order: 'desc' }],
    queryOptions: { enabled: options.enabled ?? true },
    errorNotification: false,
  });
  return { rules: result.data, total: result.total, query };
}

/**
 * Only the rules still in force. A temporary rule that has lapsed is hidden even if the server still lists it, and
 * the list updates as time passes. `truncated` is true when the server has more rules than were loaded.
 */
export function useLiveIpRules(kind: IpRuleKind, options: { enabled?: boolean } = {}) {
  const { rules, total, query } = useIpRules(kind, options);
  const now = useNow();
  const live = useMemo(() => liveRules(rules, kind, now), [rules, kind, now]);
  return { rules: live, truncated: (total ?? 0) > rules.length, query };
}
