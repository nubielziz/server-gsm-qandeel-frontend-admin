// Tests for the group picker of Quick add: it always shows the search, the box that ticks every group and the table; the choice of
// adding them on sale or switched off and the tick box for the shop show only when the caller gives what they need.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRowSelection } from '@/components/ui';
import type { ServiceGroups } from '../types';
import { QuickAddGroups, type QuickAddGroupsProps } from './QuickAddGroups';

const DATA: ServiceGroups = {
  groups: [
    { type: 'imei', remoteGroup: 'Apple', total: 5, addable: 5, imported: 0, unavailable: 0, unsupported: 0 },
    {
      type: 'server',
      remoteGroup: 'Samsung',
      total: 3,
      addable: 3,
      imported: 0,
      unavailable: 0,
      unsupported: 0,
    },
  ],
  totals: { total: 8, addable: 8, imported: 0, unavailable: 0, unsupported: 0 },
  latestRun: null,
};

/** The picker with a pick list of its own; `extra` adds the optional props. */
function Picker(extra: Partial<QuickAddGroupsProps>) {
  const selection = useRowSelection<string>();
  return (
    <QuickAddGroups
      groups={{ data: DATA, isError: false, error: null, refetch: vi.fn() }}
      selection={selection}
      picked={{ groups: 0, services: 0, tooMany: false }}
      {...extra}
    />
  );
}

describe('the group picker', () => {
  it('shows only the picker when it is given no status and no shop choice', () => {
    render(<Picker />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^Select all groups/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Add them as' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Also put them on the shop' })).not.toBeInTheDocument();
  });

  it('shows the status choice and the shop tick box when it is given them, as Quick add does', () => {
    render(
      <Picker
        serviceStatus="active"
        onServiceStatus={vi.fn()}
        publish={{ checked: false, lock: undefined, onChange: vi.fn() }}
      />,
    );
    expect(screen.getByRole('group', { name: 'Add them as' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^On sale/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Switched off/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Also put them on the shop' })).toBeEnabled();
  });

  it('keeps the status choice out when only the value is given, without a way to change it', () => {
    render(<Picker serviceStatus="active" />);
    expect(screen.queryByRole('group', { name: 'Add them as' })).not.toBeInTheDocument();
  });
});
