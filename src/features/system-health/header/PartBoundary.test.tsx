// Tests for PartBoundary: a part that throws shows a note (or nothing), the rest stays, and the part comes back when the
// reset key changes.
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartBoundary } from './PartBoundary';

// React logs every error an error boundary catches; keep the test output readable.
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
afterEach(() => vi.restoreAllMocks());

function Breaks({ broken }: { broken: boolean }) {
  if (broken) throw new TypeError("Cannot read properties of undefined (reading 'status')");
  return <p>The part works</p>;
}

describe('PartBoundary', () => {
  it('draws its children while they render', () => {
    render(
      <PartBoundary name="The verdict">
        <Breaks broken={false} />
      </PartBoundary>,
    );
    expect(screen.getByText('The part works')).toBeInTheDocument();
  });

  it('shows a neutral note naming the part when a child throws, and leaves the rest of the page alone', () => {
    render(
      <>
        <PartBoundary name="The verdict">
          <Breaks broken />
        </PartBoundary>
        <p>Another part</p>
      </>,
    );
    expect(screen.getByRole('heading', { name: 'The verdict cannot be shown' })).toBeInTheDocument();
    expect(screen.getByText(/could not be drawn/)).toBeInTheDocument();
    expect(screen.getByText('Another part')).toBeInTheDocument();
  });

  it('draws the fallback instead of the note when one is given, even an empty one', () => {
    const { container } = render(
      <PartBoundary name="The announcer" fallback={null}>
        <Breaks broken />
      </PartBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('tries the part again when the reset key changes, so the next good answer brings it back', () => {
    const { rerender } = render(
      <PartBoundary name="The verdict" resetKey={1}>
        <Breaks broken />
      </PartBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'The verdict cannot be shown' })).toBeInTheDocument();
    rerender(
      <PartBoundary name="The verdict" resetKey={1}>
        <Breaks broken={false} />
      </PartBoundary>,
    );
    // Same key: it stays on the note until there is a new answer.
    expect(screen.queryByText('The part works')).not.toBeInTheDocument();
    rerender(
      <PartBoundary name="The verdict" resetKey={2}>
        <Breaks broken={false} />
      </PartBoundary>,
    );
    expect(screen.getByText('The part works')).toBeInTheDocument();
  });
});
