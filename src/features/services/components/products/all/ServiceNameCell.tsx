// ServiceNameCell: the first cell of a row of the All view: the name, and under it in small italics "#<id>" and the code. When the server
// says the service needs a person, its words follow in the critical colour (the words are the signal, not the colour alone); when the
// server says it cannot go on the shop, that reason follows in the quiet colour (the Shop column is only as wide as its square).
import { cx } from '@/components/ui';
import type { Service } from '../../../types';
import { attentionOf, shopBlockOf } from './attention';

/** The name, its number and code, and the reasons to look. A switched-off service is written in the quiet colour. */
export function ServiceNameCell({ service }: { service: Service }) {
  const attention = attentionOf(service);
  const shopBlock = shopBlockOf(service);
  return (
    <>
      <span className={cx('block', service.status === 'disabled' && 'text-ink3')}>{service.name}</span>
      <span className="cell-sub">
        <span>{`#${service.id} · ${service.code}`}</span>
        {attention.map((item) => (
          <span key={item.reason}>
            {' · '}
            <span className="font-medium text-crit-fg" title={item.hint}>
              {item.word}
            </span>
          </span>
        ))}
        {shopBlock && (
          <span>
            {' · '}
            <span title="Why this service cannot go on the shop">{shopBlock}</span>
          </span>
        )}
      </span>
    </>
  );
}
