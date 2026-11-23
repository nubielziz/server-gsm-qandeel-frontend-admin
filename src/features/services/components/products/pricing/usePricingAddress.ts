// What the Pricing view keeps in the address (`?view=pricing&q=…&group=…&page=…&size=…`): the search text, the group, the page and its size.
// The kind is the strip's (`type`) and is written back with every change. Every address is written by `productsPath`; a change of
// the search or the group goes back to the first page, and the page size is left out of the address while it is the default.
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { parsePage } from '../../../lib/filters';
import { PRICING_DEFAULT_SIZE, PRICING_SIZES } from '../../../lib/priceGrid';
import { parseRecordId, productsPath } from '../../../lib/productsPath';

/** The part of the address the Pricing view reads. */
export type PricingAddress = { q: string; group: Id | undefined; page: number; size: number };

/** The page size an address parameter names; anything that is not one of the offered sizes is the default. */
export function parseSize(raw: string | null): number {
  const size = Number(raw);
  return PRICING_SIZES.find((offered) => offered === size) ?? PRICING_DEFAULT_SIZE;
}

/** Reads the view's keys from an address: empty text, no group, the first page and the default size when a key is missing or unreadable. */
export function readPricingAddress(params: URLSearchParams): PricingAddress {
  return {
    q: (params.get('q') ?? '').trim(),
    group: parseRecordId(params.get('group')) ?? undefined,
    page: parsePage(params),
    size: parseSize(params.get('size')),
  };
}

/**
 * The view's address and `go`, which moves to a new one (it replaces the history entry, so Back leaves the page and does not step through
 * every keystroke of the search). `go({ q })` starts again from the first page unless it names a page.
 */
export function usePricingAddress(type: ServiceType) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const address = readPricingAddress(params);
  const { q, group, size } = address;
  const go = useCallback(
    (change: Partial<PricingAddress>) => {
      const next = { q, group, page: 1, size, ...change };
      void navigate(
        productsPath({
          view: 'pricing',
          type,
          q: next.q,
          group: next.group,
          page: next.page,
          size: next.size === PRICING_DEFAULT_SIZE ? undefined : next.size,
        }),
        { replace: true },
      );
    },
    [navigate, type, q, group, size],
  );
  return { ...address, go };
}
