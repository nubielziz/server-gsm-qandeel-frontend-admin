// PresetGallery: the "Ready-made methods" section above the payment methods: one card per entry of the catalog with its logo, name and a
// Manual or Automatic tag. An available one has Add (which opens the dialog filled from it); one that is not built yet says Coming soon.
// Feature 32, backend B232 (`GET /admin/payment-gateway-presets`).
import { Badge, Button, Icon, QueryState, Skeleton } from '@/components/ui';
import { useGatewayPresets } from '../hooks/useGateways';
import { addedCount } from '../lib/gatewayPresets';
import type { GatewayPreset, PaymentGateway } from '../types';
import { PaymentMethodLogo } from './PaymentMethodLogo';

export interface PresetGalleryProps {
  /** Whether the staff member may read the catalog (it needs `payments:gateways`, like the rest of the tab). */
  enabled: boolean;
  /** The saved methods, to count how many came from each entry. */
  gateways: readonly PaymentGateway[];
  /** What the staff member may do, as props for the Add buttons (`disabled` and the reason). */
  lock: { disabled: boolean; title?: string };
  onAdd: (preset: GatewayPreset) => void;
}

/** One entry of the catalog. */
function PresetCard({
  preset,
  added,
  lock,
  onAdd,
}: {
  preset: GatewayPreset;
  added: number;
  lock: PresetGalleryProps['lock'];
  onAdd: () => void;
}) {
  const manual = preset.kind === 'manual';
  return (
    <li className="panel flex flex-wrap items-center gap-3 p-3" aria-label={preset.name}>
      <PaymentMethodLogo nameShown name={preset.name} preset={preset.key} methodType={preset.methodType} />
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold">{preset.name}</h4>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={manual ? 'neutral' : 'good'} icon={manual ? 'file' : 'bolt'}>
            {manual ? 'Manual' : 'Automatic'}
          </Badge>
          {added > 0 && <span className="text-xs text-ink3">{added} added</span>}
        </div>
      </div>
      {preset.available ? (
        <Button
          size="sm"
          aria-label={`Add ${preset.name}`}
          disabled={lock.disabled}
          title={lock.title}
          onClick={onAdd}
        >
          <Icon name="plus" className="ic-xs" />
          Add
        </Button>
      ) : (
        <Badge tone="neutral" icon="clock">
          Coming soon
        </Badge>
      )}
    </li>
  );
}

/** The gallery with its own loading and error states, so a failed catalog never hides the methods below it. */
export function PresetGallery({ enabled, gateways, lock, onAdd }: PresetGalleryProps) {
  const query = useGatewayPresets(enabled);
  const presets = query.data ?? [];
  // Without the permission (or before it is known) there is nothing to say: the tab itself is hidden from a role that lacks it.
  if (!enabled) return null;
  return (
    <section aria-labelledby="ready-made-title" className="mb-5">
      <h3 id="ready-made-title" className="text-sm font-semibold">
        Ready-made methods
      </h3>
      <p className="mb-2 text-xs text-ink3">
        Add one with its logo and instructions, then fill in your own account details. Anything else: add a
        custom method.
      </p>
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        errorTitle="Could not load the ready-made methods"
        onRetry={() => void query.refetch()}
        isEmpty={presets.length === 0}
        empty={<p className="text-sm text-ink3">There are no ready-made methods.</p>}
        skeleton={
          <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} height={64} className="rounded-lg" />
            ))}
          </div>
        }
      >
        <ul className="grid gap-3 md:grid-cols-2">
          {presets.map((preset) => (
            <PresetCard
              key={preset.key}
              preset={preset}
              added={addedCount(preset.key, gateways)}
              lock={lock}
              onAdd={() => onAdd(preset)}
            />
          ))}
        </ul>
      </QueryState>
    </section>
  );
}
