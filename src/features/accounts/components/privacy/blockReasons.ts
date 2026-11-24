// The reasons the Block dialog offers. A block is for fraud (use Suspend for a pause), so a reason is always asked for; the server takes
// exactly one of these words as the reason.
import type { SelectOption } from '@/components/ui';

/** Why a person blocks an account; the dialog offers exactly these and sends the one chosen as it is. */
export const BLOCK_REASONS = [
  'Chargeback or dispute',
  'Card testing or fraud',
  'Abuse of refunds',
  'Other',
] as const;

/** The reason menu: a prompt first (the empty value is refused), then each reason. */
export const BLOCK_REASON_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Choose a reason' },
  ...BLOCK_REASONS.map((reason) => ({ value: reason, label: reason })),
];
