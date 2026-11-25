// ReportViews: Reports › Profit, Wallet exposure, VAT and Sales funnel, one view each (the old Reports tab's switch is the page's links).
// Each report keeps its choices (split, range, period) in the address; the server works out every figure.
import { Panel } from '@/components/ui';
import { useReportView } from '../../hooks/useReportView';
import { ProfitReport } from '../ProfitReport';
import { SalesFunnelReport } from '../SalesFunnelReport';
import { VatReport } from '../VatReport';
import { WalletExposureReport } from '../WalletExposureReport';

/** Profit by day, service, supplier or merchant. It needs `reports:read`; the page shows it only then. */
export function ProfitView() {
  const { choices, setChoices } = useReportView();
  return (
    <Panel flush>
      <ProfitReport choices={choices} onChange={setChoices} />
    </Panel>
  );
}

/** What the merchant wallets hold and what is reserved. It needs `reports:read`; it has no choices of its own. */
export function ExposureView() {
  return (
    <Panel flush>
      <WalletExposureReport />
    </Panel>
  );
}

/** VAT due by country and month. It needs `reports:finance`; the period is in the address. */
export function VatView() {
  const { choices, setChoices } = useReportView();
  return (
    <Panel flush>
      <VatReport choices={choices} onChange={setChoices} />
    </Panel>
  );
}

/** How far shop sales got, step by step. It needs `reports:growth`; the range is in the address. */
export function FunnelView() {
  const { choices, setChoices } = useReportView();
  return (
    <Panel flush>
      <SalesFunnelReport choices={choices} onChange={setChoices} />
    </Panel>
  );
}
