// PipelineSection: one titled part of the Order pipeline card (Orders & suppliers tab). The card is one panel, so its parts
// are told apart by a small heading and hairlines, never by nested boxes.
import { useId, type ReactNode } from 'react';
import { cx } from '@/components/ui';

export interface PipelineSectionProps {
  title: string;
  className?: string;
  children: ReactNode;
}

/** A labelled region. The heading (h3 under the card's h2) names the table or text below it for screen readers too. */
export function PipelineSection({ title, className, children }: PipelineSectionProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cx('min-w-0', className)}>
      <h3 id={id} className="px-3.5 pb-1.5 pt-3 text-xs font-medium text-ink2">
        {title}
      </h3>
      {children}
    </section>
  );
}
