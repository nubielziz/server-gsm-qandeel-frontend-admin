// AudienceBuilder: section 2 of the composer: who gets the message. Preset buttons fill the segments (Everyone, Staff, Merchants, Retail, Specific
// people); each group then has a switch and its filters; people can be added or left out one by one. The server checks the rules again and its field
// errors show under the builder.
import { useState } from 'react';
import { SegmentedControl } from '@/components/ui';
import type { BroadcastGrants } from '../hooks/useBroadcastGrants';
import { PEOPLE_PERMISSION } from '../hooks/usePeople';
import {
  applyPreset,
  detectPreset,
  PRESET_ITEMS,
  type AudienceForm,
  type AudiencePreset,
  type PickedPerson,
  type Problems,
} from '../lib/spec';
import { audienceLeftovers, messagesUnder } from '../lib/serverErrors';
import type { PersonType } from '../types';
import { CustomerSegment } from './CustomerSegment';
import { MerchantSegment } from './MerchantSegment';
import { PeopleList } from './PeopleList';
import { PeoplePickerDialog } from './PeoplePickerDialog';
import { StaffSegment } from './StaffSegment';

export interface AudienceBuilderProps {
  audience: AudienceForm;
  onChange: (audience: AudienceForm) => void;
  grants: BroadcastGrants;
  errors: Problems;
}

const PERSON_TYPES: readonly PersonType[] = ['staff', 'account'];

export function AudienceBuilder({ audience, onChange, grants, errors }: AudienceBuilderProps) {
  const [picker, setPicker] = useState<'include' | 'exclude' | null>(null);
  // A tab of the picker is hidden when the role cannot read that list.
  const types = PERSON_TYPES.filter((type) => grants.can(PEOPLE_PERMISSION[type]));
  const blocked =
    types.length === 0 ? 'You need the staff:read or clients:read permission to pick people.' : undefined;
  const segment = { audience, onChange, grants, errors };
  const remove = (mode: 'include' | 'exclude') => (person: PickedPerson) =>
    onChange({
      ...audience,
      [mode]: audience[mode].filter((p) => !(p.type === person.type && p.id === person.id)),
    });

  return (
    <section aria-label="Audience" className="space-y-3">
      <h3 className="text-sm font-semibold">2. Audience</h3>
      <div>
        <p className="label">Who gets it</p>
        <SegmentedControl<AudiencePreset | ''>
          label="Audience preset"
          items={PRESET_ITEMS}
          value={detectPreset(audience)}
          onChange={(preset) => preset && onChange(applyPreset(audience, preset))}
        />
        <p className="hint">
          Everyone means active staff, active merchants and retail accounts with a login. Switch groups on or
          off below to change it.
        </p>
      </div>
      <StaffSegment {...segment} />
      <MerchantSegment {...segment} />
      <CustomerSegment {...segment} />
      <PeopleList
        title="Added people"
        help="Reached even when no group above includes them."
        people={audience.include}
        addLabel="Add people"
        blocked={blocked}
        error={errors.include ?? messagesUnder(errors, 'audience.include')}
        onAdd={() => setPicker('include')}
        onRemove={remove('include')}
      />
      <PeopleList
        title="Left out"
        help="Never reached, whatever the groups above say."
        people={audience.exclude}
        addLabel="Exclude people"
        blocked={blocked}
        error={errors.exclude ?? messagesUnder(errors, 'audience.exclude')}
        onAdd={() => setPicker('exclude')}
        onRemove={remove('exclude')}
      />
      {audienceLeftovers(errors) && (
        <p className="text-xs text-crit-fg" role="alert">
          {audienceLeftovers(errors)}
        </p>
      )}
      {picker && (
        <PeoplePickerDialog
          mode={picker}
          initial={audience[picker]}
          types={types}
          onClose={() => setPicker(null)}
          onConfirm={(people) => onChange({ ...audience, [picker]: people })}
        />
      )}
    </section>
  );
}
