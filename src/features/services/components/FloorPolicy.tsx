// FloorPolicy: the "Floor policy" note at the foot of the Merchant price rules view. The words are the demo's (rulesTab in
// 43-p-services.js); the server enforces the floor, and the 6% default is the demo's figure (a backend question in HANDOFF).
import { SectionHeading } from '@/components/ui';

/** A heading and one plain paragraph. */
export function FloorPolicy() {
  return (
    <section aria-label="Floor policy">
      <SectionHeading>Floor policy</SectionHeading>
      <p className="text-sm text-ink2">
        No price can go below <strong className="font-medium">supplier cost plus minimum profit</strong>.
        Minimum profit defaults to 6% of cost, at least $0.02. When a supplier raises a cost, orders are
        charged the new floor until you update the price.
      </p>
    </section>
  );
}
