// FixedPricesNote: "Fixed prices" of the Rules and groups tab: where group prices and merchant overrides are set. The demo listed
// them here (rulesTab in 43-p-services.js); the map keeps no single list of them, since a group price belongs to a service and an
// override to a merchant, so this block points to the two places instead (MISMATCHES M95).
import { Link } from 'react-router';
import { RuleSection } from './RuleSection';

/** Says where fixed prices are set. */
export function FixedPricesNote() {
  return (
    <RuleSection
      title="Fixed prices"
      sub="Group service prices and client overrides. These skip every other rule."
    >
      <p className="px-3.5 pb-3.5 text-sm text-ink2">
        Set a group price from the row menu of a service (Group prices…). Set a merchant’s own price on the
        Pricing tab of that merchant’s page, under{' '}
        <Link className="link" to="/merchants">
          Merchants
        </Link>
        .
      </p>
    </RuleSection>
  );
}
