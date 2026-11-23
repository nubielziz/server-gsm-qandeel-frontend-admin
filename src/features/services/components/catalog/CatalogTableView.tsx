// CatalogTableView: the Catalog page's default view: the header, the services table with the open service's side panel beside it, and
// the dialogs the header and the rows open. It owns the ticked rows, the open dialog and the one "On the shop" switch runner that the
// table and the panel share, so all three are dropped when another view opens. Every move that would throw away unsaved changes in the
// panel (another row, closing it, another view, a link out) asks first, through the guard it owns.
// Mounted only for a role with catalog:read, so the table and its counts are never read without it.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import { Panel, SidePanelLayout, useRowSelection } from '@/components/ui';
import type { Id } from '@/lib/api';
import { usePanelAddress } from '../../hooks/usePanelAddress';
import { usePanelGuard } from '../../hooks/usePanelGuard';
import { useServiceCounts } from '../../hooks/useServiceCounts';
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import { focusRowOpener } from '../../lib/panelFocus';
import { catalogPath, type CatalogLink } from '../../lib/paths';
import type { Service } from '../../types';
import { DiscardChangesDialog } from '../panel/DiscardChangesDialog';
import { ServicePanelHost } from '../panel/ServicePanelHost';
import { ServiceDialogs } from '../ServiceDialogs';
import type { ServiceDialogState } from '../serviceDialogState';
import { ServicesHeader } from '../ServicesHeader';
import { ServicesTab } from '../ServicesTab';
import { ShopSwitchProvider } from '../table/OnShopSwitch';
import { AddServicesHost, type AddServicesDialogComponent } from './AddServicesHost';

export interface CatalogTableViewProps {
  grants: ServiceGrants;
  /** Goes to another view of the page. */
  onOpenView: (link: CatalogLink) => void;
  /**
   * The Add services dialog. When given, the view mounts the Add services host itself, so that a service of one's own, made while
   * the panel holds unsaved changes, asks before the panel moves to it. Leave it out when the page mounts the host.
   */
  addDialog?: AddServicesDialogComponent;
}

/**
 * When the panel closes and focus has nowhere to be (the control that had it left with the panel), puts it back on the name button
 * of the row that was open, or on the table when that row is not on the page. Focus that is somewhere real (a header link that was
 * just pressed) is left alone.
 */
function useReturnFocus(open: Id | null, fallback: RefObject<HTMLElement | null>) {
  const last = useRef<Id | null>(null);
  useEffect(() => {
    if (open !== null) {
      last.current = open;
      return;
    }
    const closed = last.current;
    last.current = null;
    if (closed === null) return;
    const active = document.activeElement;
    if (active && active !== document.body && document.contains(active)) return;
    if (!focusRowOpener(closed)) fallback.current?.focus();
  }, [open, fallback]);
}

/** Header, table, the open service's panel and dialogs. */
export function CatalogTableView({ grants, onOpenView, addDialog }: CatalogTableViewProps) {
  const counts = useServiceCounts(grants.ready && grants.can('catalog:read'));
  const selection = useRowSelection<number>();
  const [dialog, setDialog] = useState<ServiceDialogState | null>(null);
  // The rows of the table's loaded page: the panel takes its service from them and reads it by id when it is not among them.
  const [rows, setRows] = useState<readonly Service[]>([]);
  const address = usePanelAddress();
  const guard = usePanelGuard(address);
  const navigate = useNavigate();
  // The table area is where focus falls back to when the row that was open is not on the page.
  const table = useRef<HTMLDivElement>(null);
  useReturnFocus(address.open, table);
  // Deleting is deliberate, so the panel of the deleted service closes without a question.
  const onDeleted = (service: Service) => {
    if (service.id === address.open) address.close();
  };

  return (
    <ShopSwitchProvider>
      <ServicesHeader
        grants={grants}
        belowFloor={counts.belowFloor}
        onBulk={() => setDialog({ kind: 'bulk' })}
        onPublishRuns={() => guard.requestLeave(() => onOpenView({ view: 'publish' }))}
        onLeave={guard.requestLeave}
      />
      <SidePanelLayout
        panel={
          address.open === null ? null : (
            <ServicePanelHost
              id={address.open}
              section={address.section}
              rows={rows}
              grants={grants}
              guard={guard}
            />
          )
        }
      >
        <div ref={table} tabIndex={-1} className="outline-none">
          <Panel flush>
            <ServicesTab
              grants={grants}
              selection={selection}
              onDialog={setDialog}
              openId={address.open}
              onOpenService={(service, section) => guard.requestOpen(service.id, section)}
              onRows={setRows}
            />
          </Panel>
        </div>
      </SidePanelLayout>
      <ServiceDialogs
        dialog={dialog}
        selection={selection}
        onClose={() => setDialog(null)}
        onDeleted={onDeleted}
      />
      {addDialog && (
        <AddServicesHost
          Dialog={addDialog}
          onOwnServiceCreated={(id) => guard.requestLeave(() => void navigate(catalogPath({ open: id })))}
        />
      )}
      {guard.move && (
        <DiscardChangesDialog sections={guard.dirty} onDiscard={guard.confirm} onKeep={guard.cancel} />
      )}
    </ShopSwitchProvider>
  );
}
