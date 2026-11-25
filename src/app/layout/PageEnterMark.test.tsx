// Tests for PageEnterMark: <main> plays its enter for a different page, and not for the first page, the same page again, or a page that
// is still loading behind its Suspense fallback.
import { render } from '@testing-library/react';
import { StrictMode, Suspense, lazy, useRef, type ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { installAnimate } from '@/lib/motion/testing/layout';
import { PageEnterContext, usePageEnterTarget } from './pageEnter';
import { PageEnterMark } from './PageEnterMark';

let restore: Array<() => void> = [];
afterEach(() => {
  for (const undo of restore) undo();
  restore = [];
});

// The shell in small: a <main> and the context around the page, as ShellFrame draws them.
function Shell({ children }: { children: ReactNode }) {
  const main = useRef<HTMLElement>(null);
  const target = usePageEnterTarget(main);
  return (
    <PageEnterContext.Provider value={target}>
      <main ref={main}>{children}</main>
    </PageEnterContext.Provider>
  );
}

function setup() {
  const stub = installAnimate();
  restore.push(stub.restore);
  return stub;
}

describe('PageEnterMark', () => {
  it('plays nothing for the first page, not even under Strict Mode', () => {
    const { animate } = setup();
    render(
      <StrictMode>
        <Shell>
          <PageEnterMark pageKey="orders:list" />
        </Shell>
      </StrictMode>,
    );
    expect(animate).not.toHaveBeenCalled();
  });

  it('plays on <main> for a second, different page, and not for the same page again', () => {
    const { animate } = setup();
    const { rerender, container } = render(
      <Shell>
        <PageEnterMark key="orders:list" pageKey="orders:list" />
      </Shell>,
    );
    rerender(
      <Shell>
        <PageEnterMark key="risk:list" pageKey="risk:list" />
      </Shell>,
    );
    expect(animate).toHaveBeenCalledTimes(1);
    const calls = animate.mock.calls as unknown as Array<[Keyframe[], KeyframeAnimationOptions]>;
    expect(calls[0][0][0]).toEqual({ opacity: 0, transform: 'translate(0px, 6px)' });
    expect(container.querySelector('main')?.animate).toBe(animate);

    // The same page drawn again (a remount, a re-render) is not a new page.
    rerender(
      <Shell>
        <PageEnterMark key="again" pageKey="risk:list" />
      </Shell>,
    );
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('plays for the page itself and not for its loading fallback', async () => {
    const { animate } = setup();
    let resolve: (page: { default: () => ReactNode }) => void = () => {};
    const Slow = lazy(() => new Promise<{ default: () => ReactNode }>((done) => (resolve = done)));
    const Page = ({ name, children }: { name: string; children: ReactNode }) => (
      <Suspense fallback={<p>loading</p>}>
        <PageEnterMark pageKey={name} />
        {children}
      </Suspense>
    );
    const { rerender, findByText } = render(
      <Shell>
        <Page key="orders" name="orders">
          <p>orders</p>
        </Page>
      </Shell>,
    );
    rerender(
      <Shell>
        <Page key="risk" name="risk">
          <Slow />
        </Page>
      </Shell>,
    );
    expect(await findByText('loading')).toBeInTheDocument();
    expect(animate).not.toHaveBeenCalled();

    resolve({ default: () => <p>risk page</p> });
    await findByText('risk page');
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('does nothing outside the shell', () => {
    const { animate } = setup();
    const { rerender } = render(<PageEnterMark key="a" pageKey="a" />);
    rerender(<PageEnterMark key="b" pageKey="b" />);
    expect(animate).not.toHaveBeenCalled();
  });
});
