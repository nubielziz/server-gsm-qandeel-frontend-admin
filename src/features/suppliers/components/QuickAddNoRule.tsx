// QuickAddNoRule: the error slot of Quick add when the server says no retail pricing rule is active: its own words, then a link to
// the Shop price rules of the Price Rules view, where the rule is made. Leaving the page closes the dialog.
import { Link } from 'react-router';
import { storefrontPricingPath } from '@/features/storefront';

/** `message` is the server's text for the refusal ("Set a retail pricing rule first."). */
export function QuickAddNoRule({ message }: { message: string }) {
  return (
    <>
      {message}{' '}
      <Link className="underline" to={storefrontPricingPath()}>
        Open Retail pricing
      </Link>
    </>
  );
}
