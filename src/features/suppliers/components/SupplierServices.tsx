// SupplierServices: the "Services" panel of the detail: the services of the console that use this supplier, as primary or as
// fallback, with the supplier's cost and the SLA. Ports `svcTbl` of supDetail in 44-p-suppliers.js, and adds the buttons
// the API allows: "Import services…" and "Edit links…" for one service's chain.
import { Badge, Button, Count, EmptyState, ErrorState, Icon, SkeletonTable } from '@/components/ui';
import { money } from '@/lib/format';
import type { SupplierGrants } from '../hooks/useSupplierGrants';
import { minutesText } from '../lib/metrics';
import { roleLabel } from '../lib/links';
import type { Supplier, SupplierLink } from '../types';

export interface SupplierServicesProps {
  supplier: Supplier;
  /** Undefined while the detail loads. */
  links: readonly SupplierLink[] | undefined;
  failed: boolean;
  error?: unknown;
  onRetry: () => void;
  grants: SupplierGrants;
  onImport: () => void;
  onEditLinks: (link: SupplierLink) => void;
}

/** The services table with Import and Edit links, and its loading, failed and empty states. */
export function SupplierServices({
  supplier,
  links,
  failed,
  error,
  onRetry,
  grants,
  onImport,
  onEditLinks,
}: SupplierServicesProps) {
  const importLock = grants.needs('catalog:create');
  const linksLock = grants.needs('catalog:update');
  const rows = [...(links ?? [])].sort(
    (a, b) => a.priority - b.priority || a.serviceName.localeCompare(b.serviceName),
  );
  const importButton = (
    <Button size="sm" disabled={importLock.disabled} title={importLock.title} onClick={onImport}>
      <Icon name="download" className="ic-sm" />
      Import services…
    </Button>
  );

  let body;
  if (failed) body = <ErrorState title="Could not load the services" error={error} onRetry={onRetry} />;
  else if (links === undefined) body = <SkeletonTable cols={4} rows={4} />;
  else if (rows.length === 0) {
    body = (
      <EmptyState icon="tag" title="No services use this supplier" cta={importButton}>
        Import its catalog to start selling its services.
      </EmptyState>
    );
  } else {
    body = (
      <div className="tbl-wrap max-h-[300px] overflow-auto">
        <table className="tbl" aria-label={`Services using ${supplier.name}`}>
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Role</th>
              <th scope="col" className="num">
                Cost
              </th>
              <th scope="col" className="num hidden sm:table-cell">
                SLA
              </th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((link) => (
              <tr key={`${link.serviceId}-${link.priority}`}>
                <td>
                  <span
                    className={link.serviceStatus === 'disabled' ? 'font-medium text-ink3' : 'font-medium'}
                  >
                    {link.serviceName}
                  </span>{' '}
                  {link.serviceCode && <span className="mono text-xs text-ink3">{link.serviceCode}</span>}
                </td>
                <td>
                  {link.priority === 1 ? (
                    <Badge tone="neutral">Primary</Badge>
                  ) : (
                    <span className="badge border border-line2 text-ink2">{roleLabel(link.priority)}</span>
                  )}
                </td>
                <td className="num">{money(link.cost)}</td>
                <td className="num hidden sm:table-cell">
                  {link.slaMinutes === null ? '–' : minutesText(link.slaMinutes)}
                </td>
                <td className="num">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={linksLock.disabled}
                    title={linksLock.title}
                    aria-label={`Edit links of ${link.serviceName}`}
                    onClick={() => onEditLinks(link)}
                  >
                    <Icon name="link" className="ic-sm" />
                    Edit links…
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="border-b border-line xl:border-b-0 xl:border-e">
      <div className="panel-h !border-b-0">
        <h3 className="panel-t flex-1">Services {links !== undefined && <Count>{rows.length}</Count>}</h3>
        {/* The empty state has its own Import button; every other state keeps it in the header. */}
        {!(links !== undefined && rows.length === 0) && importButton}
      </div>
      {body}
    </div>
  );
}
