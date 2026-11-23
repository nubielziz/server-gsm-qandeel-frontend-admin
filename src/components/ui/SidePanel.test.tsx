// Tests for SidePanel, SidePanelSection and SidePanelLayout: label, focus, Escape, no dialog, active section, the layout cases.
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidePanel, SidePanelLayout, SidePanelSection } from './SidePanel';

describe('SidePanel', () => {
  it('is an aside labelled by its title, with the sub line, badges, body and footer', () => {
    render(
      <SidePanel
        title="Service 42"
        sub="Changed today"
        badges={<span>Active</span>}
        onClose={() => {}}
        footer={<button type="button">Publish</button>}
      >
        <p>Panel body</p>
      </SidePanel>,
    );
    const panel = screen.getByRole('complementary', { name: 'Service 42' });
    expect(panel.tagName).toBe('ASIDE');
    expect(screen.getByRole('heading', { level: 2, name: 'Service 42' })).toHaveAttribute('tabindex', '-1');
    expect(within(panel).getByText('Changed today')).toBeInTheDocument();
    expect(within(panel).getByText('Active')).toBeInTheDocument();
    expect(within(panel).getByText('Panel body')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('is never a dialog and never sets dialog[open]', () => {
    render(
      <SidePanel title="Service 42" onClose={() => {}}>
        <SidePanelSection id="pricing" title="Pricing" active>
          <p>Body</p>
        </SidePanelSection>
      </SidePanel>,
    );
    expect(document.querySelector('dialog')).toBeNull();
    expect(document.querySelector('[open]')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with the close button, named Close or by closeLabel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <SidePanel title="Service 42" onClose={onClose}>
        <p>Body</p>
      </SidePanel>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <SidePanel title="Service 42" onClose={onClose} closeLabel="Close service">
        <p>Body</p>
      </SidePanel>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close service' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('moves focus to its heading when it mounts', () => {
    render(
      <SidePanel title="Service 42" onClose={() => {}}>
        <input aria-label="Name" />
      </SidePanel>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Service 42' })).toHaveFocus();
  });

  it('does not trap focus: Tab walks through the panel and out of it', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SidePanel title="Service 42" onClose={() => {}}>
          <input aria-label="Name" />
        </SidePanel>
        <button type="button">After the panel</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'After the panel' })).toHaveFocus();
  });

  it('closes on Escape while focus is inside it, on the heading and on a field', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SidePanel title="Service 42" onClose={onClose}>
        <input aria-label="Name" />
      </SidePanel>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    screen.getByLabelText('Name').focus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('handles the Escape it acts on, so it does not also reach a dialog the close opens', () => {
    render(
      <SidePanel title="Service 42" onClose={() => {}}>
        <input aria-label="Name" />
      </SidePanel>,
    );
    // fireEvent answers false when a handler called preventDefault.
    expect(fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' })).toBe(false);
  });

  it('leaves the Escape it ignores alone', () => {
    render(
      <>
        <button type="button">Elsewhere on the page</button>
        <SidePanel title="Service 42" onClose={() => {}}>
          <input aria-label="Name" />
        </SidePanel>
      </>,
    );
    expect(
      fireEvent.keyDown(screen.getByRole('button', { name: 'Elsewhere on the page' }), { key: 'Escape' }),
    ).toBe(true);
  });

  it('caps its height only from 2xl, where it is sticky, so below it the page scrolls once', () => {
    render(
      <SidePanel title="Service 42" onClose={() => {}}>
        <p>Body</p>
      </SidePanel>,
    );
    const panel = screen.getByRole('complementary', { name: 'Service 42' });
    expect(panel).toHaveClass('2xl:max-h-[calc(100dvh-5rem)]');
    expect(panel).not.toHaveClass('max-h-[calc(100dvh-5rem)]');
  });

  it('ignores Escape while focus is outside it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Elsewhere on the page</button>
        <SidePanel title="Service 42" onClose={onClose}>
          <input aria-label="Name" />
        </SidePanel>
      </>,
    );
    screen.getByRole('button', { name: 'Elsewhere on the page' }).focus();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores Escape typed in a portalled child, such as a dialog opened from a section', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SidePanel title="Service 42" onClose={onClose}>
        {createPortal(<input aria-label="In a dialog" />, document.body)}
      </SidePanel>,
    );
    screen.getByLabelText('In a dialog').focus();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('SidePanelSection', () => {
  const scrolls: { element: Element; options?: ScrollIntoViewOptions }[] = [];

  // jsdom has no scrollIntoView: record the calls instead.
  beforeEach(() => {
    scrolls.length = 0;
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value(this: Element, options?: ScrollIntoViewOptions) {
        scrolls.push({ element: this, options });
      },
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  function Sections({ active }: { active?: 'details' | 'pricing' }) {
    return (
      <SidePanel title="Service 42" onClose={() => {}}>
        <SidePanelSection id="details" title="Details" active={active === 'details'}>
          <p>Details body</p>
        </SidePanelSection>
        <SidePanelSection
          id="pricing"
          title="Pricing"
          action={<button type="button">Reset prices</button>}
          active={active === 'pricing'}
        >
          <p>Pricing body</p>
        </SidePanelSection>
      </SidePanel>
    );
  }

  it('is a section labelled by its h3, with its id and action, and is not a nested panel', () => {
    render(<Sections />);
    const pricing = screen.getByRole('region', { name: 'Pricing' });
    expect(pricing.tagName).toBe('SECTION');
    expect(pricing).toHaveAttribute('id', 'pricing');
    expect(screen.getByRole('heading', { level: 3, name: 'Pricing' })).toBeInTheDocument();
    expect(within(pricing).getByRole('button', { name: 'Reset prices' })).toBeInTheDocument();
    expect(within(pricing).getByText('Pricing body')).toBeInTheDocument();
    expect(pricing).not.toHaveClass('panel');
    expect(pricing.querySelector('.panel')).toBeNull();
  });

  it('separates a section from the next with a hairline', () => {
    render(<Sections />);
    expect(screen.getByRole('region', { name: 'Details' })).toHaveClass('border-b', 'border-line');
  });

  it('does nothing while it is not active', () => {
    render(<Sections />);
    expect(scrolls).toHaveLength(0);
  });

  it('scrolls itself into view and moves focus to its heading when it becomes active', () => {
    const { rerender } = render(<Sections />);
    rerender(<Sections active="pricing" />);
    expect(scrolls).toHaveLength(1);
    expect(scrolls[0].element).toBe(screen.getByRole('region', { name: 'Pricing' }));
    expect(scrolls[0].options).toMatchObject({ block: 'start', behavior: 'smooth' });
    expect(screen.getByRole('heading', { level: 3, name: 'Pricing' })).toHaveFocus();

    rerender(<Sections active="details" />);
    expect(scrolls).toHaveLength(2);
    expect(scrolls[1].element).toBe(screen.getByRole('region', { name: 'Details' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toHaveFocus();

    rerender(<Sections />);
    expect(scrolls).toHaveLength(2);
  });

  it('scrolls without animation when the user asks for reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
    })) as unknown as typeof window.matchMedia;
    try {
      const { rerender } = render(<Sections />);
      rerender(<Sections active="pricing" />);
      expect(scrolls[0].options).toMatchObject({ behavior: 'auto' });
    } finally {
      window.matchMedia = original;
    }
  });

  it('keeps focus on an active section when the panel opens with it (a deep link), not on the panel heading', () => {
    render(<Sections active="details" />);
    expect(scrolls).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toHaveFocus();
    expect(screen.getByRole('heading', { level: 2, name: 'Service 42' })).not.toHaveFocus();
  });

  describe('mounting its content again (contentKey)', () => {
    function Keyed({ version }: { version: string }) {
      return (
        <SidePanel title="Service 42" onClose={() => {}}>
          <SidePanelSection id="details" title="Details" contentKey={version}>
            <input aria-label="Name" />
          </SidePanelSection>
        </SidePanel>
      );
    }

    it('mounts the content again when the key changes, and keeps it while the key stays', () => {
      const { rerender } = render(<Keyed version="a" />);
      const before = screen.getByLabelText('Name');
      rerender(<Keyed version="a" />);
      expect(screen.getByLabelText('Name')).toBe(before);
      rerender(<Keyed version="b" />);
      expect(screen.getByLabelText('Name')).not.toBe(before);
    });

    it('moves focus to the section heading when the content that held it is mounted again', () => {
      const { rerender } = render(<Keyed version="a" />);
      screen.getByLabelText('Name').focus();
      rerender(<Keyed version="b" />);
      expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toHaveFocus();
    });

    it('leaves focus alone when it was outside the content', () => {
      const page = (version: string) => (
        <>
          <button type="button">Elsewhere on the page</button>
          <Keyed version={version} />
        </>
      );
      const { rerender } = render(page('a'));
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere on the page' });
      elsewhere.focus();
      rerender(page('b'));
      expect(elsewhere).toHaveFocus();
    });
  });

  it('still focuses its heading where the browser has no scrollIntoView', () => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    const { rerender } = render(<Sections />);
    rerender(<Sections active="pricing" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Pricing' })).toHaveFocus();
  });
});

describe('SidePanelLayout', () => {
  const panel = (
    <SidePanel title="Service 42" onClose={() => {}}>
      <p>Panel body</p>
    </SidePanel>
  );

  it('with no panel renders only the main area, not hidden and with no side-by-side layout', () => {
    const { container } = render(
      <SidePanelLayout panel={null}>
        <div data-testid="main">Table</div>
      </SidePanelLayout>,
    );
    expect(screen.getByTestId('main')).toBeVisible();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByTestId('main').parentElement).not.toHaveClass('hidden');
    expect(container.firstElementChild).not.toHaveClass('2xl:grid');
  });

  it('with a panel sits side by side from 2xl, the panel in a 440 to 520px column', () => {
    const { container } = render(
      <SidePanelLayout panel={panel}>
        <div data-testid="main">Table</div>
      </SidePanelLayout>,
    );
    expect(screen.getByRole('complementary', { name: 'Service 42' })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('2xl:grid');
    expect(container.firstElementChild?.className).toContain('minmax(27.5rem,32.5rem)');
  });

  it('with a panel hides the main area below 2xl, so it cannot be focused, and shows it from 2xl', () => {
    render(
      <SidePanelLayout panel={panel}>
        <div data-testid="main">
          <button type="button">Row</button>
        </div>
      </SidePanelLayout>,
    );
    const mainArea = screen.getByTestId('main').parentElement;
    expect(mainArea).toHaveClass('hidden', '2xl:block');
    // The panel is not inside the hidden area.
    expect(mainArea).not.toContainElement(screen.getByRole('complementary'));
  });

  it('keeps the main area mounted when the panel opens and closes', () => {
    const { rerender } = render(
      <SidePanelLayout panel={null}>
        <div data-testid="main">Table</div>
      </SidePanelLayout>,
    );
    const before = screen.getByTestId('main');
    rerender(
      <SidePanelLayout panel={panel}>
        <div data-testid="main">Table</div>
      </SidePanelLayout>,
    );
    expect(screen.getByTestId('main')).toBe(before);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    rerender(
      <SidePanelLayout panel={null}>
        <div data-testid="main">Table</div>
      </SidePanelLayout>,
    );
    expect(screen.getByTestId('main')).toBe(before);
    expect(screen.getByTestId('main').parentElement).not.toHaveClass('hidden');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
