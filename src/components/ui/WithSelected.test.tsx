// Tests for WithSelected: Check All / Uncheck All, and the bulk buttons that wait for a selection.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WithSelected } from './WithSelected';

function renderBar(count: number) {
  const onCheckAll = vi.fn();
  const onUncheckAll = vi.fn();
  const onEnable = vi.fn();
  const view = render(
    <WithSelected count={count} onCheckAll={onCheckAll} onUncheckAll={onUncheckAll}>
      <button type="button" onClick={onEnable}>
        Enable
      </button>
      <select aria-label="Move to group">
        <option>Group A</option>
      </select>
    </WithSelected>,
  );
  return { onCheckAll, onUncheckAll, onEnable, ...view };
}

describe('WithSelected', () => {
  it('names the group of bulk buttons "With selected"', () => {
    renderBar(0);
    const group = screen.getByRole('group', { name: 'With selected:' });
    expect(group).toContainElement(screen.getByRole('button', { name: 'Enable' }));
  });

  it('disables the bulk buttons and selects while nothing is ticked, but not Check All', async () => {
    const user = userEvent.setup();
    const { onCheckAll, onEnable } = renderBar(0);
    expect(screen.getByRole('button', { name: 'Enable' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Move to group' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check All' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Enable' }));
    expect(onEnable).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(onCheckAll).toHaveBeenCalledTimes(1);
  });

  it('enables them and says how many are ticked', async () => {
    const user = userEvent.setup();
    const { onEnable } = renderBar(3);
    expect(screen.getByRole('group', { name: 'With selected (3):' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable' })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Move to group' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Enable' }));
    expect(onEnable).toHaveBeenCalledTimes(1);
  });

  it('asks to untick everything', async () => {
    const user = userEvent.setup();
    const { onUncheckAll } = renderBar(3);
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    expect(onUncheckAll).toHaveBeenCalledTimes(1);
  });
});
