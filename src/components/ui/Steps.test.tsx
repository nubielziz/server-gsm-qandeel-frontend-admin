// Tests for Steps: ordered list, aria-current on the current step, done steps, the polite step announcement.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Steps } from './Steps';

const steps = [
  { id: 'pick', label: 'Pick services' },
  { id: 'price', label: 'Set prices' },
  { id: 'review', label: 'Review' },
];

describe('Steps', () => {
  it('is an ordered list with one item per step, in order', () => {
    render(<Steps steps={steps} current="pick" />);
    const list = screen.getByRole('list', { name: 'Steps' });
    expect(list.tagName).toBe('OL');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Pick services');
    expect(items[1]).toHaveTextContent('Set prices');
    expect(items[2]).toHaveTextContent('Review');
  });

  it('marks only the current step with aria-current="step"', () => {
    const { container } = render(<Steps steps={steps} current="price" />);
    const marked = container.querySelectorAll('[aria-current]');
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute('aria-current', 'step');
    expect(marked[0]).toHaveTextContent('Set prices');
  });

  it('shows the steps before the current one as done, with an icon and a word for screen readers', () => {
    render(<Steps steps={steps} current="review" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Done: Pick services');
    expect(items[1]).toHaveTextContent('Done: Set prices');
    expect(items[0].querySelector('svg')).not.toBeNull();
    expect(items[1].querySelector('svg')).not.toBeNull();
    // The current step has no icon and no "Done".
    expect(items[2]).not.toHaveTextContent('Done');
    expect(items[2].querySelector('svg')).toBeNull();
  });

  it('shows no step as done on the first step, and later steps as not done', () => {
    render(<Steps steps={steps} current="pick" />);
    const items = screen.getAllByRole('listitem');
    for (const item of items) {
      expect(item).not.toHaveTextContent('Done');
      expect(item.querySelector('svg')).toBeNull();
    }
  });

  it('leaves every step to do when the current id is not in the list', () => {
    const { container } = render(<Steps steps={steps} current="missing" />);
    expect(container.querySelector('[aria-current]')).toBeNull();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('has a polite live region that is empty at first and announces each change of step', () => {
    const { rerender } = render(<Steps steps={steps} current="pick" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveClass('sr-only');
    expect(status).toBeEmptyDOMElement();

    rerender(<Steps steps={steps} current="price" />);
    expect(screen.getByRole('status')).toHaveTextContent('Step 2 of 3: Set prices');

    rerender(<Steps steps={steps} current="review" />);
    expect(screen.getByRole('status')).toHaveTextContent('Step 3 of 3: Review');

    rerender(<Steps steps={steps} current="price" />);
    expect(screen.getByRole('status')).toHaveTextContent('Step 2 of 3: Set prices');
  });

  it('keeps the same live region element across changes, so screen readers hear the update', () => {
    const { rerender } = render(<Steps steps={steps} current="pick" />);
    const before = screen.getByRole('status');
    rerender(<Steps steps={steps} current="price" />);
    expect(screen.getByRole('status')).toBe(before);
  });

  it('puts className on its outer element', () => {
    const { container } = render(<Steps steps={steps} current="pick" className="mb-4" />);
    expect(container.firstElementChild).toHaveClass('mb-4');
  });
});
