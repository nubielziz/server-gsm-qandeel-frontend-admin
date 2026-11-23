// AddServiceForm: "+Add Service" by hand: one service from a label-left form that ends in the pinned "Add" bar. Saving creates the service (and
// sends an Inactive or Manual choice in one update after it), then opens the new service's edit view, where a service is completed
// (fields, supplier connection, prices, the shop). Ports no demo screen: the demo has no way to add a service.
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button, PinnedBar } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import { productsPath } from '../../../lib/productsPath';
import { AddServiceFields } from './AddServiceFields';
import { useAddServiceForm } from './useAddServiceForm';

export interface AddServiceFormProps {
  type: ServiceType;
  grants: ServiceGrants;
  /** What sits above the rows, inside the view's frame (the heading and the "Add services from a supplier" checkbox). */
  header?: ReactNode;
}

/**
 * The form and its pinned bar. The bar is the last child of the form, so a short form still ends at the foot of the window. "Add" needs
 * `catalog:create`. A server message that names no field of the form shows above the bar; the ones that name a field show under it.
 */
export function AddServiceForm({ type, grants, header }: AddServiceFormProps) {
  const navigate = useNavigate();
  const lock = grants.needs('catalog:create');
  const { form, submit, pending, problem } = useAddServiceForm(
    type,
    (service) => void navigate(productsPath({ view: 'edit', id: service.id, type })),
  );
  return (
    <form className="view-frame" noValidate onSubmit={(event) => void submit(event)}>
      <div>
        {header}
        <AddServiceFields form={form} type={type} grants={grants} />
        {problem && (
          <p role="alert" className="mt-3 text-sm text-crit-fg">
            {problem}
          </p>
        )}
      </div>
      <PinnedBar>
        <Button type="submit" variant="primary" loading={pending} {...lock}>
          Add
        </Button>
        {lock.disabled && lock.title && <span className="text-xs text-ink3">{lock.title}</span>}
      </PinnedBar>
    </form>
  );
}
