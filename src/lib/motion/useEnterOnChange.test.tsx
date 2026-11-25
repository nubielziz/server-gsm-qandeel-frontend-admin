// Tests for the enter hooks: nothing plays on the first render or for an element that has just appeared, a change plays on the same element,
// and the sideways move of a tab follows the order of the tabs.
import { render } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { installAnimate, setReducedMotion } from './testing/layout';
import { useEnterOnChange, useTabEnter } from './useEnterOnChange';

let restore: Array<() => void> = [];
afterEach(() => {
  for (const undo of restore) undo();
  restore = [];
});

function fake() {
  const stub = installAnimate();
  restore.push(stub.restore);
  return stub;
}

const frames = (call: unknown) => (call as [Keyframe[], unknown])[0];

function Page({ id }: { id: string }) {
  const ref = useEnterOnChange<HTMLDivElement>(id);
  return <div ref={ref} data-testid="page" />;
}

const ORDER = ['a', 'b', 'c'];
function Tabbed({ value, show = true }: { value: string; show?: boolean }) {
  const ref = useTabEnter<HTMLDivElement>(value, ORDER);
  return show ? <div ref={ref} data-testid="panel" /> : null;
}

describe('useEnterOnChange', () => {
  it('plays nothing on the first render, not even under Strict Mode', () => {
    const { animate } = fake();
    render(
      <StrictMode>
        <Page id="one" />
      </StrictMode>,
    );
    expect(animate).not.toHaveBeenCalled();
  });

  it('plays a rise on the same element when the key changes, and not when it stays', () => {
    const { animate } = fake();
    const { rerender, getByTestId } = render(<Page id="one" />);
    const el = getByTestId('page');
    rerender(<Page id="one" />);
    expect(animate).not.toHaveBeenCalled();
    rerender(<Page id="two" />);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(frames(animate.mock.calls[0])[0]).toEqual({ opacity: 0, transform: 'translate(0px, 6px)' });
    expect(getByTestId('page')).toBe(el);
  });

  it('plays nothing with reduced motion', () => {
    const { animate } = fake();
    restore.push(setReducedMotion(true));
    const { rerender } = render(<Page id="one" />);
    rerender(<Page id="two" />);
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('useTabEnter', () => {
  it('plays nothing on the first render', () => {
    const { animate } = fake();
    render(
      <StrictMode>
        <Tabbed value="b" />
      </StrictMode>,
    );
    expect(animate).not.toHaveBeenCalled();
  });

  it('comes from the end side for a tab further along and from the start side for one nearer the start', () => {
    const { animate } = fake();
    const { rerender } = render(<Tabbed value="a" />);
    rerender(<Tabbed value="c" />);
    expect(frames(animate.mock.calls[0])[0]).toEqual({ opacity: 0, transform: 'translate(8px, 0px)' });
    rerender(<Tabbed value="b" />);
    expect(frames(animate.mock.calls[1])[0]).toEqual({ opacity: 0, transform: 'translate(-8px, 0px)' });
  });

  it('only fades for a value that is not in the order', () => {
    const { animate } = fake();
    const { rerender } = render(<Tabbed value="a" />);
    rerender(<Tabbed value="zzz" />);
    expect(frames(animate.mock.calls[0])[0]).toEqual({ opacity: 0, transform: 'translate(0px, 0px)' });
  });

  it('plays nothing for content that has just appeared (a page that showed a skeleton first)', () => {
    const { animate } = fake();
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <>
          <button onClick={() => setOn(true)}>show</button>
          <Tabbed value={on ? 'b' : 'a'} show={on} />
        </>
      );
    }
    const { getByText } = render(<Harness />);
    getByText('show').click();
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('the ready flag', () => {
  function Loading({ value, ready }: { value: string; ready: boolean }) {
    const ref = useTabEnter<HTMLDivElement>(value, ORDER, ready);
    return <div ref={ref} />;
  }
  const move = (call: unknown) => (frames(call)[0] as { transform: string }).transform;

  it('plays at once when a change finds the content ready', () => {
    const { animate } = fake();
    const { rerender } = render(<Loading value="a" ready />);
    rerender(<Loading value="c" ready />);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(move(animate.mock.calls[0])).toBe('translate(8px, 0px)');
  });

  it('waits while the old rows are shown, then plays once when ready turns true, with the direction of the change', () => {
    const { animate } = fake();
    const { rerender } = render(<Loading value="c" ready />);
    rerender(<Loading value="a" ready={false} />);
    rerender(<Loading value="a" ready={false} />);
    expect(animate).not.toHaveBeenCalled();
    rerender(<Loading value="a" ready />);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(move(animate.mock.calls[0])).toBe('translate(-8px, 0px)');
    rerender(<Loading value="a" ready />);
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('plays once for two changes before ready, in the direction from the value shown last to the final one', () => {
    const { animate } = fake();
    const { rerender } = render(<Loading value="a" ready />);
    rerender(<Loading value="c" ready={false} />);
    rerender(<Loading value="b" ready={false} />);
    rerender(<Loading value="b" ready />);
    expect(animate).toHaveBeenCalledTimes(1);
    // From a to b (not from c to b): the content comes from the end side.
    expect(move(animate.mock.calls[0])).toBe('translate(8px, 0px)');
  });

  it('plays nothing when the value is back at the one shown before ready', () => {
    const { animate } = fake();
    const { rerender } = render(<Loading value="a" ready />);
    rerender(<Loading value="b" ready={false} />);
    rerender(<Loading value="a" ready={false} />);
    rerender(<Loading value="a" ready />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('is also taken by useEnterOnChange', () => {
    const { animate } = fake();
    function Keyed({ id, ready }: { id: string; ready: boolean }) {
      const ref = useEnterOnChange<HTMLDivElement>(id, undefined, ready);
      return <div ref={ref} />;
    }
    const { rerender } = render(<Keyed id="one" ready />);
    rerender(<Keyed id="two" ready={false} />);
    expect(animate).not.toHaveBeenCalled();
    rerender(<Keyed id="two" ready />);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(move(animate.mock.calls[0])).toBe('translate(0px, 6px)');
  });
});
