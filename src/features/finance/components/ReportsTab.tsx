// ReportsTab: the Reports tab of the Finance page: a switch between the reports the staff member may read (profit and wallet
// exposure need `reports:read`, VAT needs `reports:finance`) and the open report. New (MISMATCHES M124); each report reads its own route.
import { EmptyState, SegmentedControl } from '@/components/ui';
import type { FinanceGrants } from '../hooks/useFinanceGrants';
import { useReportView } from '../hooks/useReportView';
import { ProfitReport } from './ProfitReport';
import { VatReport } from './VatReport';
import { WalletExposureReport } from './WalletExposureReport';

export function ReportsTab({ grants }: { grants: FinanceGrants }) {
  const view = useReportView(grants.permissions);
  if (!view.report) {
    return (
      <EmptyState icon="lock" title="No reports to show">
        Your role cannot read any report.
      </EmptyState>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
        <SegmentedControl
          label="Report"
          items={view.reports.map((report) => ({ value: report.id, label: report.label }))}
          value={view.report}
          onChange={view.setReport}
        />
      </div>
      <div className="border-t border-line">
        {view.report === 'profit' && <ProfitReport choices={view.choices} onChange={view.setChoices} />}
        {view.report === 'exposure' && <WalletExposureReport />}
        {view.report === 'vat' && <VatReport choices={view.choices} onChange={view.setChoices} />}
      </div>
    </>
  );
}
