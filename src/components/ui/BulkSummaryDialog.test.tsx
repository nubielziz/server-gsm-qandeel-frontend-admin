// Tests for BulkSummaryDialog: generic wording by default, the caller's noun when given, one line per refused record, Close.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkSummaryDialog, type BulkSummary } from './BulkSummaryDialog';
import './testing/dialogPolyfill';

const summary: BulkSummary = {
  verb: 'switched off',
  done: 2,
  total: 3,
  failed: [{ label: 'SVC-7', reason: 'Not found.' }],
};

describe('BulkSummaryDialog', () => {
  it('says "items" when no noun is given and lists the refused record with its reason', async () => {
    render(<BulkSummaryDialog summary={summary} onClose={() => {}} />);
    const dialog = within(await screen.findByRole('dialog', { name: '2 of 3 items switched off' }));
    expect(
      dialog.getByText("1 could not be switched off. The server's reason is shown for each."),
    ).toBeInTheDocument();
    expect(dialog.getByText('SVC-7')).toBeInTheDocument();
    expect(dialog.getByText(/Not found\./)).toBeInTheDocument();
  });

  it('uses the noun the caller gives, in the singular for a total of one', async () => {
    const { rerender } = render(
      <BulkSummaryDialog summary={summary} unit={{ one: 'service', many: 'services' }} onClose={() => {}} />,
    );
    expect(await screen.findByRole('dialog', { name: '2 of 3 services switched off' })).toBeInTheDocument();
    rerender(
      <BulkSummaryDialog
        summary={{ ...summary, done: 0, total: 1 }}
        unit={{ one: 'service', many: 'services' }}
        onClose={() => {}}
      />,
    );
    expect(await screen.findByRole('dialog', { name: '0 of 1 service switched off' })).toBeInTheDocument();
  });

  it('shows two refused records that have the same label', async () => {
    const twice: BulkSummary = {
      ...summary,
      failed: [
        { label: 'Same', reason: 'First reason.' },
        { label: 'Same', reason: 'Second reason.' },
      ],
    };
    render(<BulkSummaryDialog summary={twice} onClose={() => {}} />);
    expect(await screen.findByText(/First reason\./)).toBeInTheDocument();
    expect(screen.getByText(/Second reason\./)).toBeInTheDocument();
  });

  it('asks the parent to close from the footer button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BulkSummaryDialog summary={summary} onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: '2 of 3 items switched off' });
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });
});
