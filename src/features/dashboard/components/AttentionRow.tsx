// AttentionRow: one row of "Needs attention": severity badge, title, detail and a button. Ports `row` of attentionPanel() in
// 40-p-dashboard.js. The server sent facts; lib/attention.ts wrote the words.
import { cx, Icon } from '@/components/ui';
import { describeAttention } from '../lib/attention';
import type { AttentionItem, DashboardScope } from '../types';
import { PageButtonLink } from './PageButtonLink';
import { SeverityBadge } from './SeverityBadge';

export interface AttentionRowProps {
  item: AttentionItem;
  scope: DashboardScope;
  /** The moment relative times are measured from. */
  now: number;
}

/** One row: the severity, the sentence from `describeAttention`, and a button only to a page the staff member may open. */
export function AttentionRow({ item, scope, now }: AttentionRowProps) {
  const view = describeAttention(item, { now, scope });
  return (
    <li className="attn-row px-3.5 py-2.5">
      <span className="attn-b">
        <SeverityBadge severity={item.severity} />
      </span>
      <p className={cx('attn-t text-sm', item.severity === 'critical' ? 'font-semibold' : 'font-medium')}>
        {view.title}
      </p>
      {view.meta && <p className="attn-m text-xs text-ink3">{view.meta}</p>}
      {view.action && (
        <PageButtonLink target={view.action} className="attn-a">
          {view.action.label}
          <Icon name="arrowR" className="ic-xs" />
        </PageButtonLink>
      )}
    </li>
  );
}
