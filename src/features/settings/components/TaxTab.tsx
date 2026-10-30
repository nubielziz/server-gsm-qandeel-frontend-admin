// TaxTab: the "Tax and currency" tab: the currencies panel above the tax-by-country panel, as in the demo's tabTax (55-p-settings.js).
// Each panel reads with its own permission (`settings:update` for currencies, `tax:read` for rates) and says so when the role lacks it.
import { CurrenciesPanel } from './CurrenciesPanel';
import { TaxPanel } from './TaxPanel';

/** The two panels. */
export function TaxTab() {
  return (
    <div className="grid gap-4">
      <CurrenciesPanel />
      <TaxPanel />
    </div>
  );
}
