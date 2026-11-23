// QuickAddStatusChoice: the choice "Add them as": on sale or switched off. One component for the Quick add dialog (below its group
// list) and for the last step of the Add services flow, so both say the same words.
import { RadioGroup, type RadioOption } from '@/components/ui';
import type { QuickAddServiceStatus } from '../types';

const STATUS_OPTIONS: readonly RadioOption[] = [
  {
    value: 'active',
    label: 'On sale',
    description: 'Merchants can order them at once, at the suggested price.',
  },
  {
    value: 'disabled',
    label: 'Switched off',
    description: 'Check them in the Catalog and switch them on yourself.',
  },
];

export interface QuickAddStatusChoiceProps {
  value: QuickAddServiceStatus;
  onChange: (status: QuickAddServiceStatus) => void;
  /** The name of the radio group; two groups on one page need two names. */
  name: string;
}

/** Two bordered options side by side; the server's default, on sale, is the first. */
export function QuickAddStatusChoice({ value, onChange, name }: QuickAddStatusChoiceProps) {
  return (
    <RadioGroup
      legend="Add them as"
      name={name}
      options={STATUS_OPTIONS}
      value={value}
      listClassName="grid gap-2 sm:grid-cols-2"
      onChange={(event) => onChange(event.target.value === 'disabled' ? 'disabled' : 'active')}
    />
  );
}
