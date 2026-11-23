// CatalogBulkBar: the Catalog selection bar wired to its actions: it runs them (useCatalogBulk), unticks the services they covered, shows
// what the server refused in one summary, and opens the publish run that "Put on the shop" made (after the summary, when there is one).
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BulkSummaryDialog, type BulkSummary, type RowSelection } from '@/components/ui';
import { storefrontPublishPath } from '@/features/storefront';
import type { Id } from '@/lib/api';
import { useCatalogBulk, type BulkResult } from '../../hooks/useCatalogBulk';
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import type { Service, ServiceCategory } from '../../types';
import { SelectionBar } from '../SelectionBar';

export interface CatalogBulkBarProps {
  /** The ticked services of this page. */
  services: readonly Service[];
  selection: RowSelection<number>;
  grants: ServiceGrants;
  shop: boolean;
  categories: readonly ServiceCategory[];
  /** Opens the bulk price dialog for the ticked services (the page owns the dialogs). */
  onBulkPrice: () => void;
}

const UNIT = { one: 'service', many: 'services' };

/** The bar, the summary of refusals, and the move to the publish run. */
export function CatalogBulkBar({
  services,
  selection,
  grants,
  shop,
  categories,
  onBulkPrice,
}: CatalogBulkBarProps) {
  const bulk = useCatalogBulk();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  // The run "Put on the shop" made, opened once the summary of the refused switch-ons is closed.
  const [nextRun, setNextRun] = useState<Id | null>(null);

  const finish = async (action: Promise<BulkResult>, covered: readonly Service[]) => {
    const result = await action;
    selection.setMany(
      covered.map((service) => service.id),
      false,
    );
    if (result.summary) {
      setSummary(result.summary);
      setNextRun(result.runId);
    } else if (result.runId !== null) void navigate(storefrontPublishPath(result.runId));
  };
  const closeSummary = () => {
    setSummary(null);
    if (nextRun !== null) void navigate(storefrontPublishPath(nextRun));
    setNextRun(null);
  };

  return (
    <>
      <SelectionBar
        services={services}
        grants={grants}
        shop={shop}
        categories={categories}
        progress={bulk.progress}
        starting={bulk.starting}
        onSetCategory={(category: ServiceCategory) =>
          void finish(bulk.setCategory(services, category), services)
        }
        onBulkPrice={onBulkPrice}
        onPutOn={() => void finish(bulk.putOn(services), services)}
        onTakeOff={() => void finish(bulk.takeOff(services), services)}
        onSwitchOff={() => void finish(bulk.switchOff(services), services)}
        onClear={selection.clear}
      />
      {summary && <BulkSummaryDialog summary={summary} unit={UNIT} onClose={closeSummary} />}
    </>
  );
}
