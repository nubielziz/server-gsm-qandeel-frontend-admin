// Tests for FooterPager: the results line, the navigation landmark and its named buttons, Go To, the page numbers and Page size.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FooterPager, type FooterPagerProps } from './FooterPager';

function renderPager(props: Partial<FooterPagerProps> = {}) {
  const onPage = vi.fn();
  const onPageSize = vi.fn();
  const view = render(
    <FooterPager page={1} pageSize={50} total={876} onPage={onPage} onPageSize={onPageSize} {...props} />,
  );
  return { onPage, onPageSize, ...view };
}

const numbers = () => screen.getAllByRole('button', { name: /^Page \d+$/ });

describe('FooterPager results line', () => {
  it('says which rows are shown and how many there are', () => {
    renderPager();
    expect(screen.getByText('Results: 1 - 50 of 876')).toBeInTheDocument();
  });

  it('follows the page, and the last page ends at the total', () => {
    const { rerender } = renderPager({ page: 2 });
    expect(screen.getByText('Results: 51 - 100 of 876')).toBeInTheDocument();
    rerender(<FooterPager page={18} pageSize={50} total={876} onPage={() => {}} onPageSize={() => {}} />);
    expect(screen.getByText('Results: 851 - 876 of 876')).toBeInTheDocument();
  });

  it('groups thousands, and says 0 for an empty result', () => {
    const { rerender } = renderPager({ total: 1240 });
    expect(screen.getByText('Results: 1 - 50 of 1,240')).toBeInTheDocument();
    rerender(<FooterPager page={1} pageSize={50} total={0} onPage={() => {}} onPageSize={() => {}} />);
    expect(screen.getByText('Results: 0')).toBeInTheDocument();
  });

  it('clamps a page that does not exist to the last one', () => {
    renderPager({ page: 99 });
    expect(screen.getByText('Results: 851 - 876 of 876')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 18' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('FooterPager navigation', () => {
  it('is a navigation landmark named Pagination, with named buttons', () => {
    renderPager({ page: 3 });
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    for (const name of ['First page', 'Previous page', 'Next page', 'Last page']) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('disables first and previous on the first page, next and last on the last', () => {
    const { rerender } = renderPager({ page: 1 });
    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Last page' })).toBeEnabled();
    rerender(<FooterPager page={18} pageSize={50} total={876} onPage={() => {}} onPageSize={() => {}} />);
    expect(screen.getByRole('button', { name: 'First page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
  });

  it('asks for the page the button names', async () => {
    const user = userEvent.setup();
    const { onPage } = renderPager({ page: 3 });
    await user.click(screen.getByRole('button', { name: 'First page' }));
    expect(onPage).toHaveBeenLastCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPage).toHaveBeenLastCalledWith(2);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole('button', { name: 'Last page' }));
    expect(onPage).toHaveBeenLastCalledWith(18);
    await user.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(onPage).toHaveBeenLastCalledWith(5);
  });

  it('marks the current page, and clicking it asks for nothing', async () => {
    const user = userEvent.setup();
    const { onPage } = renderPager({ page: 3 });
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current');
    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPage).not.toHaveBeenCalled();
  });

  it('draws a window of page numbers and not all of them', () => {
    renderPager({ page: 1 });
    expect(numbers().map((button) => button.textContent)).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('FooterPager Go To', () => {
  it('shows the current page and goes to the typed page on Enter', async () => {
    const user = userEvent.setup();
    const { onPage } = renderPager({ page: 3 });
    const box = screen.getByLabelText('Go To:');
    expect(box).toHaveValue('3');
    await user.clear(box);
    await user.type(box, '7{Enter}');
    expect(onPage).toHaveBeenCalledTimes(1);
    expect(onPage).toHaveBeenCalledWith(7);
  });

  it('clamps a page past the end to the last one, and ignores the page it is already on', async () => {
    const user = userEvent.setup();
    const { onPage } = renderPager();
    const box = screen.getByLabelText('Go To:');
    await user.clear(box);
    await user.type(box, '99{Enter}');
    expect(onPage).toHaveBeenLastCalledWith(18);
    onPage.mockClear();
    await user.clear(box);
    await user.type(box, '1{Enter}');
    expect(onPage).not.toHaveBeenCalled();
  });

  it('takes digits only and drops what was typed when the box is left', async () => {
    const user = userEvent.setup();
    const { onPage } = renderPager();
    const box = screen.getByLabelText('Go To:');
    await user.clear(box);
    await user.type(box, 'a5');
    expect(box).toHaveValue('5');
    await user.tab();
    expect(box).toHaveValue('1');
    expect(onPage).not.toHaveBeenCalled();
  });
});

describe('FooterPager Page size', () => {
  it('offers 25, 50, 100 and 200 with the current size chosen', () => {
    renderPager();
    const select = screen.getByLabelText('Page size:');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['25', '50', '100', '200']);
    expect(select).toHaveValue('50');
  });

  it('adds a size that is not in the list, and takes the sizes the page gives', () => {
    const { rerender } = renderPager({ pageSize: 30 });
    expect(
      within(screen.getByLabelText('Page size:'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['25', '30', '50', '100', '200']);
    rerender(
      <FooterPager
        page={1}
        pageSize={20}
        total={100}
        sizes={[10, 20]}
        onPage={() => {}}
        onPageSize={() => {}}
      />,
    );
    expect(
      within(screen.getByLabelText('Page size:'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['10', '20']);
  });

  it('reports the size as a number', async () => {
    const user = userEvent.setup();
    const { onPageSize } = renderPager();
    await user.selectOptions(screen.getByLabelText('Page size:'), '100');
    expect(onPageSize).toHaveBeenCalledWith(100);
  });
});

describe('FooterPager placement', () => {
  it('sits in a pinned bar of its own by default', () => {
    renderPager();
    expect(screen.getByRole('navigation', { name: 'Pagination' }).closest('.pinned-bar')).not.toBeNull();
  });

  it("puts the view's actions in a row above the footer, in the same pinned bar", () => {
    renderPager({ actions: <button type="button">Save prices</button> });
    const bar = screen.getByRole('navigation', { name: 'Pagination' }).closest('.pinned-bar');
    expect(bar).not.toBeNull();
    expect(bar).toContainElement(screen.getByRole('button', { name: 'Save prices' }));
    expect(document.querySelectorAll('.pinned-bar')).toHaveLength(1);
  });

  it('is a plain bar in the flow when inline', () => {
    renderPager({ inline: true });
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav.closest('.pinned-bar')).toBeNull();
    expect(nav.closest('.pager-inline')).not.toBeNull();
  });
});
