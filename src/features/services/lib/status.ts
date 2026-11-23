// Words and lists for the service screens: the four types, the two statuses and the option lists.
// The type labels are the orders feature's (the demo's spelling in a `TypeTag`, MISMATCHES M21).
import type { SelectOption } from '@/components/ui';
import { TYPE_LABEL } from '@/features/orders';
import type { ServiceOptionList, ServiceStatus, ServiceType } from '../types';

export { TYPE_LABEL };

/** The four kinds of service, in the order the demo lists them. */
export const SERVICE_TYPES: readonly ServiceType[] = ['imei', 'server', 'remote', 'file'];

/** The type menu of a form (no "all" entry). */
export const TYPE_OPTIONS: readonly SelectOption[] = SERVICE_TYPES.map((type) => ({
  value: type,
  label: TYPE_LABEL[type],
}));

/** What the Enabled switch does, in words, for the toast and the switch's accessible name. */
export const STATUS_TOAST: Record<ServiceStatus, { title: string; body: string }> = {
  active: { title: 'enabled', body: 'Merchants can order it again.' },
  disabled: { title: 'disabled', body: 'Merchants no longer see it. Open orders continue.' },
};

/** The three option lists of a service, in the order the dialog shows them. */
export const OPTION_LISTS: readonly { id: ServiceOptionList; label: string; hint: string }[] = [
  { id: 'model', label: 'Models', hint: 'Device models the buyer can pick.' },
  { id: 'network', label: 'Networks', hint: 'Carriers or networks the buyer can pick.' },
  { id: 'mep', label: 'MEP', hint: 'MEP values the buyer can pick.' },
];
