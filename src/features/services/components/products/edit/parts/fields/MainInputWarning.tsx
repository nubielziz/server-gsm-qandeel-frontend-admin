// MainInputWarning: the advice line of the Custom Fields section for an IMEI service whose draft has no main input. The shop's order form draws
// only a service's custom fields (decision 029), so an IMEI service with none marked "Main input" has no box for the IMEI and cannot be ordered.
import { Icon } from '@/components/ui';
import type { ServiceType } from '../../../../../types';

export interface MainInputWarningProps {
  /** The service's type: only an IMEI service needs a main input for the shop to sell it. */
  serviceType: ServiceType;
  /** Whether a row of the current draft (saved or not) is the main input. */
  hasMainInput: boolean;
}

/**
 * A warning (the editor's tinted note with the alert icon) shown only when the service is an IMEI service and no row of the draft is the
 * main input. It is advice: it follows the draft as the rows change and never blocks the section's Save, because the server decides what a
 * service may hold and staff may be building the list in several steps.
 */
export function MainInputWarning({ serviceType, hasMainInput }: MainInputWarningProps) {
  if (serviceType !== 'imei' || hasMainInput) return null;
  return (
    <p role="status" className="mb-3 flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg">
      <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
      <span>
        This IMEI service has no main input field. Buyers cannot order it in the shop until one field is
        marked Main input.
      </span>
    </p>
  );
}
