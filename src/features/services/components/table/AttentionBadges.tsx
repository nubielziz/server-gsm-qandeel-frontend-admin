// AttentionBadges: why a Catalog row needs a person, as badges under its name (icon and word, never colour alone). The reasons and
// their order are the server's (`attention`, only the ones this role may see). Each badge opens the part of the service's panel where the
// reason is dealt with (`?open=<id>&section=…`).
import { Badge, type BadgeTone, type IconName } from '@/components/ui';
import type { PanelSection } from '../../hooks/useServiceView';
import type { AttentionReason, Service } from '../../types';

/** How each reason shows, and the panel section that deals with it. */
const ATTENTION_BADGES: Record<
  AttentionReason,
  { tone: BadgeTone; icon: IconName; word: string; section: PanelSection; hint: string }
> = {
  no_supplier: {
    tone: 'serious',
    icon: 'server',
    word: 'No supplier',
    section: 'suppliers',
    hint: 'Orders cannot be sent: link a supplier.',
  },
  below_floor: {
    tone: 'crit',
    icon: 'alert',
    word: 'Below floor',
    section: 'prices',
    hint: 'The merchant price is under cost plus minimum profit.',
  },
  price_proposal: {
    tone: 'warn',
    icon: 'clock',
    word: 'Price waiting',
    section: 'prices',
    hint: 'A new shop price waits to be applied or kept.',
  },
  publish_failed: {
    tone: 'crit',
    icon: 'xCircle',
    word: 'Publish failed',
    section: 'shop',
    hint: 'The last try to put it on the shop was refused.',
  },
};

export interface AttentionBadgesProps {
  service: Service;
  onOpen: (service: Service, section: PanelSection) => void;
}

/** Nothing when the row needs no one (or the key is absent). */
export function AttentionBadges({ service, onOpen }: AttentionBadgesProps) {
  const reasons = service.attention ?? [];
  if (reasons.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {reasons.map((reason) => {
        const badge = ATTENTION_BADGES[reason];
        return (
          <button
            key={reason}
            type="button"
            className="rounded focus-visible:outline focus-visible:outline-2"
            title={badge.hint}
            onClick={() => onOpen(service, badge.section)}
          >
            <Badge tone={badge.tone} icon={badge.icon}>
              {badge.word}
            </Badge>
          </button>
        );
      })}
    </span>
  );
}
