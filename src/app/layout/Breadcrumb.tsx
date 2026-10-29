// Breadcrumb: "Group / Page", plus the open record's name on detail pages. Ports the `crumb` of renderTopbar() in 90-app.js.
import { useResourceParams } from '@refinedev/core';
import { Link } from 'react-router';
import { toPageResource } from '../resources';
import { useCurrentBreadcrumbTitle } from './breadcrumbTitle';

function Separator({ className }: { className?: string }) {
  return (
    <span className={className ? `text-ink3 ${className}` : 'text-ink3'} aria-hidden="true">
      /
    </span>
  );
}

/**
 * The group is hidden on narrow screens. On a detail page the page name becomes a link back to the list and the
 * record's name (set with useBreadcrumbTitle) is the current item. A route that is not a page (404) shows only the
 * name its page set.
 */
export function Breadcrumb() {
  const { resource } = useResourceParams();
  const page = toPageResource(resource);
  const record = useCurrentBreadcrumbTitle();
  if (!page && !record) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {page && (
        <>
          <span className="hidden text-ink3 sm:inline">{page.meta.group}</span>
          <Separator className="hidden sm:inline" />
        </>
      )}
      {page && record ? (
        <>
          <Link className="text-ink3 hover:text-ink" to={page.path}>
            {page.meta.label}
          </Link>
          <Separator />
          <span className="truncate font-medium" aria-current="page">
            {record}
          </span>
        </>
      ) : (
        <span className="truncate font-medium" aria-current="page">
          {page?.meta.label ?? record}
        </span>
      )}
    </nav>
  );
}
