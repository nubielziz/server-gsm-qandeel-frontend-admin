// RefundsOverview: the four refund and dispute figures on the Overview of the Money page (decision 026). It only reads the figures and draws
// them; a figure the staff member may not read is left out, so a role without refund rights sees nothing from this feature.
import { useRefundFigures } from '../hooks/useRefundFigures';
import { useRefundGrants } from '../hooks/useRefundGrants';
import { RefundStrip } from './RefundStrip';

/** The refund figures of the Overview: refunded in 30 days, waiting for you, card disputes open, lost to chargebacks. */
export function RefundsOverview() {
  const grants = useRefundGrants();
  const figures = useRefundFigures(grants.can, grants.ready);
  return <RefundStrip figures={figures} can={grants.can} />;
}
