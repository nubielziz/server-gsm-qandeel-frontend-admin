// ServiceNameCell: the first cell of a row of the All view: the name, and under it in small italics "#<id>" and the code. When the server
// says the service needs a person, its words follow in the critical colour (the words are the signal, not the colour alone); a service
// delivered from code stock says how many codes it holds there instead of "No supplier"; when the
// server says it cannot go on the shop, that reason follows in the quiet colour (the Shop column is only as wide as its square).
import { cx } from '@/components/ui';
import type { Service } from '../../../types';
import { attentionOf, shopBlockOf, stockWordsOf, type StockTone } from './attention';

const STOCK_TONE: Record<StockTone, string> = {
  good: 'text-good-fg',
  neutral: 'text-ink2',
  crit: 'text-crit-fg',
};

/** The name, its number and code, and the reasons to look. A switched-off service is written in the quiet colour. */
export function ServiceNameCell({ service }: { service: Service }) {
  const stock = stockWordsOf(service);
  // A service with its own codes needs no supplier: its stock is the news, so "No supplier" is not repeated beside it.
  const attention = attentionOf(service).filter((item) => !(stock && item.reason === 'no_supplier'));
  const shopBlock = shopBlockOf(service);
  return (
    <>
      <span className={cx('block', service.status === 'disabled' && 'text-ink3')}>{service.name}</span>
      <span className="cell-sub">
        <span>{`#${service.id} · ${service.code}`}</span>
        {stock && (
          <span>
            {' · '}
            <span className={cx('font-medium', STOCK_TONE[stock.tone])} title={stock.hint}>
              {stock.word}
            </span>
          </span>
        )}
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
