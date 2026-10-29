// Panel: the surface that groups content (the demo's panel({ title, sub, right, body, flush, cls, id })).
import { useId, type ReactNode } from 'react';
import { cx } from './cx';

export interface PanelProps {
  title?: ReactNode;
  /** Muted line under the title. */
  sub?: ReactNode;
  /** Header controls on the right (buttons, segmented control…). */
  right?: ReactNode;
  /** No inner padding: for tables and lists that run edge to edge. */
  flush?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
}

/** A hairline-bordered 8px card. Panels are never nested; split a panel with hairlines instead. */
export function Panel({ title, sub, right, flush = false, id, className, children }: PanelProps) {
  const titleId = useId();
  return (
    <section id={id} className={cx('panel', className)} aria-labelledby={title ? titleId : undefined}>
      {(title || right) && (
        <div className="panel-h">
          <div className="min-w-[13rem] flex-1">
            {title && (
              <h2 id={titleId} className="panel-t">
                {title}
              </h2>
            )}
            {sub && <p className="panel-s">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={flush ? undefined : 'panel-b'}>{children}</div>
    </section>
  );
}
