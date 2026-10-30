// Words and lists for the service screens: the four types, the two statuses, the execution mode and the option lists.
// The type labels are the orders feature's (the demo's spelling in a `TypeTag`, MISMATCHES M21).
import type { SelectOption } from '@/components/ui';
import { TYPE_LABEL } from '@/features/orders';
import type { ExecutionMode, ServiceOptionList, ServiceStatus, ServiceType } from '../types';

export { TYPE_LABEL };

/** The four kinds of service, in the order the demo lists them. */
export const SERVICE_TYPES: readonly ServiceType[] = ['imei', 'server', 'remote', 'file'];

/** The type menu of a form (no "all" entry). */
export const TYPE_OPTIONS: readonly SelectOption[] = SERVICE_TYPES.map((type) => ({
  value: type,
  label: TYPE_LABEL[type],
}));

/** The type menu of a filter. */
export const TYPE_FILTER_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All types' },
  ...TYPE_OPTIONS,
];

/** What the Enabled switch does, in words, for the toast and the switch's accessible name. */
export const STATUS_TOAST: Record<ServiceStatus, { title: string; body: string }> = {
  active: { title: 'enabled', body: 'Merchants can order it again.' },
  disabled: { title: 'disabled', body: 'Merchants no longer see it. Open orders continue.' },
};

/** What the Auto switch does, for its toast. */
export const MODE_TOAST: Record<ExecutionMode, { title: string; body: string }> = {
  auto: { title: 'on', body: 'Orders go to the supplier automatically.' },
  manual: { title: 'off', body: 'New orders wait for an operator to dispatch them.' },
};

/** The three option lists of a service, in the order the dialog shows them. */
export const OPTION_LISTS: readonly { id: ServiceOptionList; label: string; hint: string }[] = [
  { id: 'model', label: 'Models', hint: 'Device models the buyer can pick.' },
  { id: 'network', label: 'Networks', hint: 'Carriers or networks the buyer can pick.' },
  { id: 'mep', label: 'MEP', hint: 'MEP values the buyer can pick.' },
];
