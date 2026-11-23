// Tests for the result of the single-services path: the counts, one line per shop preview (a link to review and publish it, or the
// server's words when it could not be started), and the link telling the flow to close.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { storefrontPublishPath } from '@/features/storefront';
import type { BatchOutcome, FailedShopLine, ShopLine } from '../../../lib/singlesFlow';
import { SinglesResult } from './SinglesResult';

const outcome = (shop: ShopLine, created = 500): BatchOutcome => ({
  sent: 500,
  result: { created, updated: 0, unchanged: 0 },
  shop,
});

/** A line whose preview could not be started, keeping the ids of the services its batch created (from `first`). */
const failed = (
  services: number,
  message: string,
  options: { forbidden?: boolean; first?: number } = {},
): FailedShopLine => ({
  kind: 'failed',
  services,
  message,
  serviceIds: Array.from({ length: services }, (_, index) => (options.first ?? 100) + index),
  forbidden: options.forbidden ?? false,
});

function show(
  outcomes: BatchOutcome[],
  total: number,
  onNavigate = vi.fn(),
  retry: { onRetry?: (line: FailedShopLine) => void; retrying?: string | null } = {},
) {
  render(
    <MemoryRouter>
      <SinglesResult outcomes={outcomes} total={total} onNavigate={onNavigate} {...retry} />
    </MemoryRouter>,
  );
  return onNavigate;
}

describe('the result of the single-services path', () => {
  it('counts what was added and links each shop preview, saying nothing is on the shop yet', () => {
    show([outcome({ kind: 'started', runId: 41, services: 500 })], 500);
    expect(screen.getByText('500 services added')).toBeInTheDocument();
    expect(screen.getByText('A shop preview is ready for 500 services.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review and publish' })).toHaveAttribute(
      'href',
      storefrontPublishPath(41),
    );
    expect(screen.getByText(/^Nothing is on the shop yet/)).toBeInTheDocument();
  });

  it('numbers the batches of a long list, and shows a refusal in the server’s words without a link', () => {
    show(
      [
        outcome({ kind: 'started', runId: 41, services: 500 }),
        outcome(failed(500, 'A publish run is already going.'), 500),
      ],
      1_000,
    );
    expect(screen.getByText('1,000 services added')).toBeInTheDocument();
    expect(screen.getByText('Batch 1 of 2: A shop preview is ready for 500 services.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Batch 2 of 2: The shop preview for 500 services could not be started. A publish run is already going.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Review and publish' })).toHaveLength(1);
  });

  it('says so when the server did not name the services it created', () => {
    show([outcome({ kind: 'unknown', services: 500 })], 500);
    expect(
      screen.getByText(
        '500 services added, but the server did not say which, so no shop preview was prepared.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review and publish' })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Nothing is on the shop yet/)).not.toBeInTheDocument();
  });

  it('shows only the counts when no shop preview was asked for', () => {
    show([outcome({ kind: 'off' }, 2), outcome({ kind: 'nothing' }, 0)], 1_000);
    expect(screen.getByText('2 services added')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Shop previews' })).not.toBeInTheDocument();
  });

  it('tells the flow when a link is followed, so it can close before the page changes', async () => {
    const onNavigate = show([outcome({ kind: 'started', runId: 41, services: 500 })], 500);
    await userEvent.setup().click(screen.getByRole('link', { name: 'Review and publish' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('is plain about a preview that could not be started: no Try again unless the flow can ask again', () => {
    show([outcome(failed(500, 'The shop is busy.'))], 500);
    expect(
      screen.getByText('The shop preview for 500 services could not be started. The shop is busy.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/ })).not.toBeInTheDocument();
  });
});

describe('a shop preview that could not be started', () => {
  it('offers Try again, which asks again for exactly the services of that batch', async () => {
    const line = failed(3, 'The shop is busy.', { first: 7 });
    const onRetry = vi.fn();
    show([outcome(line, 3)], 3, vi.fn(), { onRetry });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(line);
    expect(onRetry.mock.calls[0][0].serviceIds).toEqual([7, 8, 9]);
  });

  it('names the batch on each Try again of a long list, and holds the others while one is asked for', () => {
    const second = failed(500, 'Busy.', { first: 600 });
    show([outcome(failed(500, 'Busy.', { first: 100 })), outcome(second)], 1_000, vi.fn(), {
      onRetry: vi.fn(),
      retrying: '600',
    });
    const one = screen.getByRole('button', { name: 'Try again: batch 1 of 2' });
    const two = screen.getByRole('button', { name: 'Try again: batch 2 of 2' });
    expect(one).toBeDisabled();
    expect(two).toBeDisabled();
    expect(two).toHaveAttribute('aria-busy', 'true');
    expect(one).not.toHaveAttribute('aria-busy');
  });

  it('names the missing permission after a 403 instead of offering Try again', () => {
    show([outcome(failed(3, 'Forbidden.', { forbidden: true }), 3)], 3, vi.fn(), { onRetry: vi.fn() });
    expect(
      screen.getByText(
        'The shop preview for 3 services could not be started. You need the storefront:create permission.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Forbidden.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/ })).not.toBeInTheDocument();
  });

  it('shows the link in place of the failure once the preview was asked for again', () => {
    show([outcome({ kind: 'started', runId: 41, services: 3 }, 3)], 3, vi.fn(), { onRetry: vi.fn() });
    expect(screen.getByRole('link', { name: 'Review and publish' })).toHaveAttribute(
      'href',
      storefrontPublishPath(41),
    );
    expect(screen.queryByRole('button', { name: /Try again/ })).not.toBeInTheDocument();
  });
});
