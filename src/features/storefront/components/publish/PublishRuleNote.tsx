// PublishRuleNote: the line under the start's choices that says where prices come from. With no active retail pricing rule it is a
// warning: services that need a rule's price cannot be published until a rule exists. Reading the rules needs pricing:read; without
// it the plain line stays, since the preview says the same thing row by row.
import { Link } from 'react-router';
import { storefrontPricingPath } from '../../lib/paths';

/** `noRule` is true only when the server answered that no rule is active. */
export function PublishRuleNote({ noRule }: { noRule: boolean }) {
  if (noRule) {
    return (
      <p className="rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="status">
        No retail pricing rule is active. Services without a price cannot be published until you make a rule
        or type their prices.{' '}
        <Link className="link" to={storefrontPricingPath()}>
          Make a rule
        </Link>
      </p>
    );
  }
  return (
    <p className="text-sm text-ink2">
      Prices come from the{' '}
      <Link className="link" to={storefrontPricingPath()}>
        retail pricing rules
      </Link>
      .
    </p>
  );
}
