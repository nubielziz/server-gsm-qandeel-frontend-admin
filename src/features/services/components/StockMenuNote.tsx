// StockMenuNote: the short note under a service menu that offers only the services delivered from code stock (the Inventory view's filter and
// the import dialog). The menu reads one page of names, so when the server counts more than it holds the note says the list is short.
import { isStockMenuShort, type StockServiceChoices } from '../hooks/useChoices';

export interface StockMenuNoteProps {
  /** What the stock menu read; the note shows only when the server counts more services than the menu holds. */
  choices: StockServiceChoices | undefined;
}

/** "Only the first 200 of 340 services delivered from code stock are listed.", or nothing while the menu holds them all. */
export function StockMenuNote({ choices }: StockMenuNoteProps) {
  if (!choices || !isStockMenuShort(choices)) return null;
  return (
    <p className="hint mt-1" role="status">
      {`Only the first ${choices.services.length} of ${choices.total} services delivered from code stock are listed.`}
    </p>
  );
}
