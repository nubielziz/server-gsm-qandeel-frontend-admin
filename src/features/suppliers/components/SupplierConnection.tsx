// SupplierConnection: the "Connection" panel: the API type, base URL, account name, a hint of the API key, the last sync, the
// balance alert and the limits. Ports the `conn` block of supDetail in 44-p-suppliers.js. The key is write-only, so there is no
// copy button: only the first characters the server keeps as a hint are shown.
import { KeyValue } from '@/components/ui';
import { ago, money0, useNow } from '@/lib/format';
import { driverLabel, limitsText, maskedKey } from '../lib/connection';
import type { Supplier } from '../types';

export function SupplierConnection({ supplier }: { supplier: Supplier }) {
  const now = useNow();
  return (
    <div>
      <div className="panel-h !border-b-0">
        <h3 className="panel-t flex-1">Connection</h3>
      </div>
      <KeyValue
        variant="stacked"
        className="p-3.5"
        rows={[
          ['API', driverLabel(supplier.driver)],
          ['Base URL', <span className="mono [overflow-wrap:anywhere]">{supplier.baseUrl}</span>],
          ['Username', <span className="mono">{supplier.username || '–'}</span>],
          [
            'API key',
            <span className="flex items-center gap-2">
              <span className="mono">{maskedKey(supplier.apiKeyHint)}</span>
              <span className="text-xs text-ink3">Never shown again</span>
            </span>,
          ],
          ['Last sync', supplier.balanceCheckedAt ? ago(supplier.balanceCheckedAt, now) : 'Never'],
          ['Alert below', `${money0(supplier.lowBalanceAlert)} prepaid`],
          ['Limits', limitsText(supplier)],
        ]}
      />
    </div>
  );
}
