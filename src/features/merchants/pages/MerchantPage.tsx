// MerchantPage: one merchant (`/merchants/:id`, the demo's `pageMerchant` in 42-p-merchants.js). It reads the id from the address and
// shows the merchant's detail. The detail is keyed by the id, so moving from one merchant to another (the "Referred by" link)
// starts clean instead of showing the previous merchant's figures while the new ones load.
import { useParams } from 'react-router';
import { MerchantDetail } from '../components/MerchantDetail';

export function MerchantPage() {
  const { id: raw } = useParams();
  const id = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : null;
  return <MerchantDetail key={id ?? 'none'} id={id} />;
}
