// GroupsReview: under the group picker of the Add services flow: what adding the picked groups does, in the server's own terms (the
// category, the price for merchants, the shop price rules, the order fields). Nothing is worked out here; the server does it all.
import { Link } from 'react-router';
import { storefrontPricingPath } from '@/features/storefront';
import { servicesText, sourceText } from '../../../lib/quickAdd';
import { ruleLine, type ShopRule } from '../../../lib/quickAddFlow';

export interface GroupsReviewProps {
  supplierName: string;
  /** `all` when every group with something to add is picked. */
  scope: 'all' | 'groups';
  /** How many groups are picked. */
  groups: number;
  /** How many services the picks add up to. */
  services: number;
  /** What is known about the shop price rules. */
  rule: ShopRule;
}

/** The sentence that says what is added, then one line per thing the server does for each service. */
export function GroupsReview({ supplierName, scope, groups, services, rule }: GroupsReviewProps) {
  return (
    <section
      aria-label="What adding them does"
      className="space-y-2 rounded-md border border-line bg-sunken px-3 py-2.5"
    >
      <p className="text-sm font-medium" aria-live="polite">
        This adds {servicesText(services)} from {sourceText(scope, groups, supplierName)}.
      </p>
      <ul className="list-disc space-y-1 ps-5 text-sm text-ink2">
        <li>Category: named after the group. Missing categories are created.</li>
        <li>Price for merchants: the supplier&rsquo;s cost plus the default minimum profit.</li>
        <li>
          {ruleLine(rule)}{' '}
          <Link className="link" to={storefrontPricingPath()}>
            Open the shop price rules
          </Link>
        </li>
        <li>Order fields and quantities are copied from the supplier.</li>
        <li>Services already in the console are not changed.</li>
      </ul>
    </section>
  );
}
