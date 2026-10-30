// Mock arithmetic of a refund: the part that comes out of revenue and the part that comes out of VAT, in proportion to the
// amount. Ports `refundSplit` of 12-state-b2c.js. The real server does this sum; the mock only needs plausible numbers.
import { round } from '@/lib/format';

/** `gross` is what the customer paid, `tax` the VAT inside it, `amount` what goes back (all USD). */
export function splitRefund(
  gross: number,
  tax: number,
  amount: number,
): { net: number; tax: number; total: number } {
  const share = amount / gross;
  const net = round((gross - tax) * share, 2);
  const vat = tax > 0 ? round(tax * share, 2) : 0;
  return { net, tax: vat, total: round(net + vat, 2) };
}
