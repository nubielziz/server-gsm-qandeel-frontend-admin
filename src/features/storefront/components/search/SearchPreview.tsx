// SearchPreview: "Test a search", a box above the pinned results: it asks `GET /admin/search/preview?q=` and lists the top 10
// services the shop would show now, with the pinned ones marked and the number a rule hides, so staff test a rule before they
// leave. Only saved rules count. New in the Search tab.
import { useState, type FormEvent } from 'react';
import { Badge, Button, errorText, Icon, Panel, SearchInput, Skeleton } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { useSearchPreview } from '../../hooks/useSearchAdmin';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';

/** The box, its button and the answer. */
export function SearchPreview({ grants }: { grants: StorefrontGrants }) {
  const [text, setText] = useState('');
  const [asked, setAsked] = useState('');
  const preview = useSearchPreview(asked, grants.can('storefront:read'));

  const ask = (event: FormEvent) => {
    event.preventDefault();
    const next = text.trim();
    // The same words again ask again: a rule may have been saved since.
    if (next === asked) void preview.refetch();
    else setAsked(next);
  };
  const unavailable = isApiError(preview.error) && preview.error.code === 'UNAVAILABLE';
  const hits = [...(preview.data?.hits ?? [])].sort((a, b) => a.position - b.position);

  return (
    <Panel
      title="Test a search"
      sub="See what a visitor gets for some words right now. Only saved rules count, and a new rule shows here within a minute."
      className="mb-4"
    >
      <form
        role="search"
        aria-label="Test a search"
        className="flex flex-wrap items-center gap-2"
        onSubmit={ask}
      >
        <SearchInput value={text} onChange={setText} placeholder="Words a visitor would type" />
        <Button
          type="submit"
          size="sm"
          disabled={text.trim() === ''}
          loading={preview.isFetching && asked !== ''}
        >
          Show results
        </Button>
      </form>
      <div className="mt-3" aria-live="polite">
        {asked === '' ? null : preview.isLoading ? (
          <div className="space-y-1.5">
            <Skeleton height={20} />
            <Skeleton height={20} />
            <Skeleton height={20} />
          </div>
        ) : preview.isError ? (
          <p className="flex items-start gap-1.5 text-sm text-crit-fg" role="alert">
            <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
            {unavailable
              ? 'The search engine is not answering, so there is nothing to preview. Try again in a moment.'
              : errorText(preview.error)}
          </p>
        ) : preview.data ? (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink3">
              <span>
                Top {hits.length} for <span className="mono text-ink">{asked}</span>
              </span>
              {preview.data.engine === 'fallback' && (
                <Badge tone="warn" icon="alert">
                  Database search: rules do not apply
                </Badge>
              )}
            </div>
            {hits.length === 0 ? (
              <p className="text-sm text-ink2">No service matches these words.</p>
            ) : (
              <ol
                aria-label={`Results for ${asked}`}
                className="divide-y divide-line rounded-md border border-line"
              >
                {hits.map((hit) => (
                  <li key={hit.serviceId} className="flex items-center gap-2 px-2.5 py-1.5 text-sm">
                    <span className="mono w-5 text-ink3">{hit.position}</span>
                    <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                    {hit.pinned && (
                      <Badge tone="accent" icon="tag">
                        Pinned
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {preview.data.hiddenIds.length > 0 && (
              <p className="mt-2 text-xs text-ink3">
                {preview.data.hiddenIds.length}{' '}
                {preview.data.hiddenIds.length === 1 ? 'service is' : 'services are'} hidden from this search
                by a rule.
              </p>
            )}
          </>
        ) : null}
      </div>
    </Panel>
  );
}
