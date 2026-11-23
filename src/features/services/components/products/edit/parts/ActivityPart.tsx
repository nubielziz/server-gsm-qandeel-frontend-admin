// ActivityPart: the "Activity" part of the edit view: where this service's orders are, the price check for it, and the delete action with its
// confirm question. It has no form, so it has no Save bar.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, FormRow, SectionHeading } from '@/components/ui';
import { DeleteServiceDialog } from '../../../DeleteServiceDialog';
import { lastAllLink } from '../../all/lastAllAddress';
import { priceCheckPath, serviceOrdersPath } from '../activityLinks';
import type { ServicePartProps } from '../../types';

/**
 * The Activity part. The orders link needs `orders:read` and the price check `pricing:read`; without one the row says so instead of linking.
 * Deleting needs `catalog:delete`; the server refuses a service that has orders and its words show in the question. After a delete the
 * editor goes back to the list.
 */
export function ActivityPart({ service, grants }: ServicePartProps) {
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const canOrders = grants.can('orders:read');
  const canCheck = grants.can('pricing:read');
  const canDelete = grants.needs('catalog:delete');
  return (
    <div>
      <SectionHeading as="h3">Activity</SectionHeading>
      <FormRow label="Orders" hint="The Orders page, searched for the name of this service.">
        {canOrders ? (
          <Link className="link" to={serviceOrdersPath(service.name)}>
            Open the orders of this service
          </Link>
        ) : (
          <p className="text-sm text-ink3">You need the orders:read permission to see its orders.</p>
        )}
      </FormRow>
      <FormRow
        label="Price check"
        hint="The price each merchant pays for this service, and the steps that built it."
      >
        {canCheck ? (
          <Link className="link" to={priceCheckPath(service.type, service.id)}>
            Check the price of this service
          </Link>
        ) : (
          <p className="text-sm text-ink3">You need the pricing:read permission to check its price.</p>
        )}
      </FormRow>
      <SectionHeading as="h3">Delete service</SectionHeading>
      <FormRow
        label={null}
        hint="The service and its prices are removed. A service that has orders cannot be deleted: switch it off in Overview instead."
      >
        <span title={canDelete.title} className="inline-flex">
          <Button variant="danger" disabled={canDelete.disabled} onClick={() => setAsking(true)}>
            Delete service…
          </Button>
        </span>
        {canDelete.disabled && canDelete.title && <p className="mt-1 text-xs text-ink3">{canDelete.title}</p>}
      </FormRow>
      {asking && (
        <DeleteServiceDialog
          service={service}
          onClose={() => setAsking(false)}
          onDeleted={() => void navigate(lastAllLink(service.type))}
        />
      )}
    </div>
  );
}
