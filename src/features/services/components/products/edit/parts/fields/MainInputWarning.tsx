// MainInputWarning: the advice line of the Custom Fields section for an IMEI service whose draft has no main input. An IMEI service no longer
// forces an IMEI (decision 031): its order form is its custom fields, and the main input is the one the supplier receives as the order's own.
import { Icon } from '@/components/ui';
import type { ServiceType } from '../../../../../types';

export interface MainInputWarningProps {
  /** The service's type: only an IMEI service gets the advice. */
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
        No field is marked Main input. Mark the field the order is about (the IMEI, a serial, an ECID) so the
        supplier receives it.
      </span>
    </p>
  );
}
