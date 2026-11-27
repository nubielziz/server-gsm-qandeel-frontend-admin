// AddServiceFields: the rows of the +Add Service form, in the order of the layout the owner asked for: Service Name (with its "- Select -" menu),
// Service Listed In Group, then the settings (ServiceTermsRows). There is no Code row: the server makes the code. Label on the left, control on the
// right; every message under its row.
import type { UseFormReturn } from 'react-hook-form';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import type { AddServiceValues } from './addServiceForm';
import { ServiceGroupRow } from './ServiceGroupRow';
import { ServiceNameRow } from './ServiceNameRow';
import { ServiceTermsRows } from './ServiceTermsRows';

export interface AddServiceFieldsProps {
  form: UseFormReturn<AddServiceValues>;
  type: ServiceType;
  grants: ServiceGrants;
}

/** The fields only: the form around them, its bar and its save belong to AddServiceForm. */
export function AddServiceFields({ form, type, grants }: AddServiceFieldsProps) {
  return (
    <div>
      <ServiceNameRow form={form} type={type} grants={grants} />
      <ServiceGroupRow form={form} type={type} />
      <ServiceTermsRows form={form} grants={grants} />
    </div>
  );
}
