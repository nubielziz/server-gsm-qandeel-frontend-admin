// A test host for the one shop switch (`usePutOnShop`) on its own: it lists the services that match a search, one switch each, and nothing else,
// so the hook is tested without a page. The list is read under the shared rows key, so the refresh the hook makes after a move reads it
// again, as it does for a view. Import it from tests only.
import { listServices } from '../api';
import { usePutOnShop } from '../hooks/usePutOnShop';
import { SERVICE_ROWS_KEY, useApiQuery } from '@/lib/query';

/** One switch per service found by `q`: on when its shop page is switched on. */
export function ShopSwitchProbe({ q }: { q: string }) {
  const { toggle, isBusy } = usePutOnShop();
  const rows = useApiQuery({
    queryKey: [...SERVICE_ROWS_KEY, 'probe', q],
    queryFn: ({ signal }) => listServices({ q, sort: ['name'], order: ['asc'] }, { signal }),
    select: (result) => result.data,
  });
  return (
    <ul aria-label="Services">
      {(rows.data ?? []).map((service) => (
        <li key={service.id}>
          <button
            type="button"
            role="switch"
            aria-label={`${service.name} on the shop`}
            aria-checked={service.isListed === true}
            aria-busy={isBusy(service.id)}
            disabled={isBusy(service.id)}
            onClick={() => toggle(service, service.isListed !== true)}
          />
        </li>
      ))}
    </ul>
  );
}
