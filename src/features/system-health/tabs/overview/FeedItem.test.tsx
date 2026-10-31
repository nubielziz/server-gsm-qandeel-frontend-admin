// Tests for FeedItem, the row of the Overview tab's open alerts and ongoing incidents: the severity slot, the title as a
// link or plain text, and the second line whose facts are joined with " · ".
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { FeedItem, type FeedItemProps } from './FeedItem';

function renderItem(props: Partial<FeedItemProps> = {}) {
  return render(
    <MemoryRouter>
      <ul>
        <FeedItem
          severity={<b>Major</b>}
          title="Supplier timeouts"
          href={null}
          facts={['Rapid IMEI']}
          {...props}
        />
      </ul>
    </MemoryRouter>,
  );
}

/** The second line of the row (the first paragraph is the title). */
const factsLine = () => screen.getByRole('listitem').querySelectorAll('p')[1]!;

describe('FeedItem', () => {
  it('puts the severity in a slot at least 5rem wide that never shrinks, so titles line up', () => {
    renderItem();
    const slot = screen.getByRole('listitem').firstElementChild!;
    expect(slot).toHaveClass('min-w-20', 'flex-none');
    expect(slot).toHaveTextContent('Major');
  });

  it('joins the facts with a dot, keeps the dot with the part before it, and hides it from a screen reader', () => {
    renderItem({ facts: ['Rapid IMEI', 'Started 10:14', '35m ago'] });
    const line = factsLine();
    expect(line.textContent).toBe('Rapid IMEI · Started 10:14 · 35m ago');
    expect(line.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('leaves out a fact that prints nothing, so no separator stands alone', () => {
    renderItem({ facts: [null, undefined, '', false, 'Started 10:14', null] });
    const line = factsLine();
    expect(line.textContent).toBe('Started 10:14');
    expect(line.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('makes the title a link when it has an address and plain text when it has none', () => {
    const { unmount } = renderItem({ href: '/system-health?tab=alerts' });
    expect(screen.getByRole('link', { name: 'Supplier timeouts' })).toHaveAttribute(
      'href',
      '/system-health?tab=alerts',
    );
    unmount();
    renderItem({ href: null });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Supplier timeouts')).toBeInTheDocument();
  });

  it('opens the second line with the status badge, before the facts', () => {
    renderItem({ status: <i>Identified</i>, facts: ['Rapid IMEI'] });
    const line = screen.getByText('Identified').closest('div')!;
    expect(line.textContent).toBe('IdentifiedRapid IMEI');
  });
});
