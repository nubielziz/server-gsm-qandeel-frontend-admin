// Tests for the strip above the preview table while rows are ticked: a hand-made selection of more rows than the route takes by id
// disables the five actions and says why, while "all that match" has no limit. (The page-level tests are `pages/PublishBulk.test.tsx`.)
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/App';
import { setupMockApi } from '@/test/renderApp';
import { BULK_IDS_MAX } from '../../lib/publishPreview';
import { PublishBulkBar, type PublishBulkBarProps } from './PublishBulkBar';

setupMockApi();

const ACTIONS = ['Include', 'Leave out', 'Set brand…', 'Set carrier…', 'Set country…'];

/** The bar inside the app's providers, with the props of a selection; `over` changes what a test is about. */
function bar(over: Partial<PublishBulkBarProps>) {
  const props: PublishBulkBarProps = {
    runId: 5,
    select: { itemIds: [1] },
    ticked: 1,
    allMatching: false,
    total: 600,
    offerAll: false,
    onSelectAll: vi.fn(),
    onClear: vi.fn(),
    ...over,
  };
  render(
    <MemoryRouter>
      <AppProviders>
        <PublishBulkBar {...props} />
      </AppProviders>
    </MemoryRouter>,
  );
  return { props, region: within(screen.getByRole('region', { name: 'Selected rows' })) };
}

describe('a selection of more rows than the route takes by id', () => {
  it(`disables the five actions above ${BULK_IDS_MAX} ticked rows, says why, and keeps Clear`, () => {
    const { region } = bar({ select: null, ticked: BULK_IDS_MAX + 1 });
    expect(region.getByText(`${BULK_IDS_MAX + 1} selected`)).toBeInTheDocument();
    expect(
      region.getByText(`Pick at most ${BULK_IDS_MAX} rows by hand, or select all that match.`),
    ).toBeInTheDocument();
    for (const name of ACTIONS) expect(region.getByRole('button', { name })).toBeDisabled();
    expect(region.getByRole('button', { name: 'Clear' })).toBeEnabled();
  });

  it(`leaves them on at exactly ${BULK_IDS_MAX} rows, with no hint`, () => {
    const { region } = bar({
      ticked: BULK_IDS_MAX,
      select: { itemIds: Array.from({ length: BULK_IDS_MAX }, (_, i) => i + 1) },
    });
    for (const name of ACTIONS) expect(region.getByRole('button', { name })).toBeEnabled();
    expect(region.queryByText(/Pick at most/)).not.toBeInTheDocument();
  });

  it('has no limit for "all that match": the server finds the rows by the filter', () => {
    const { region } = bar({ select: { filter: {} }, ticked: BULK_IDS_MAX + 1, allMatching: true });
    expect(region.getByText('All 600 rows that match are selected')).toBeInTheDocument();
    for (const name of ACTIONS) expect(region.getByRole('button', { name })).toBeEnabled();
    expect(region.queryByText(/Pick at most/)).not.toBeInTheDocument();
  });
});
