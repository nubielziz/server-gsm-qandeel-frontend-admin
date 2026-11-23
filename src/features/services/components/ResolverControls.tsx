// ResolverControls: the two menus above the resolver, Merchant and Service, as label-left rows (the form grammar of the Product / Services page).
// Ports `controls` of resolverTab in 43-p-services.js.
// A menu shows the chosen id even when the first 200 names do not include it (a link can name any service), so a deep link never
// shows the wrong choice.
import { SelectField } from '@/components/ui';
import { withChosen } from '../lib/select';
import type { MerchantOption, NamedRef } from '../types';

export interface ResolverControlsProps {
  merchants: readonly MerchantOption[];
  services: readonly NamedRef[];
  merchantId: number | null;
  serviceId: number | null;
  onMerchant: (id: string) => void;
  onService: (id: string) => void;
}

/** The Merchant and Service menus. */
export function ResolverControls({
  merchants,
  services,
  merchantId,
  serviceId,
  onMerchant,
  onService,
}: ResolverControlsProps) {
  const merchantOptions = withChosen(
    merchants.map((merchant) => ({
      value: merchant.id,
      label: merchant.group ? `${merchant.name} (${merchant.group.name})` : merchant.name,
    })),
    merchantId,
    `Merchant ${merchantId}`,
  );
  const serviceOptions = withChosen(
    services.map((service) => ({ value: service.id, label: service.name })),
    serviceId,
    `Service ${serviceId}`,
  );
  return (
    <div className="mb-4">
      <SelectField
        layout="row"
        label="Merchant"
        value={merchantId ?? ''}
        options={merchantOptions}
        onChange={(event) => onMerchant(event.target.value)}
      />
      <SelectField
        layout="row"
        label="Service"
        value={serviceId ?? ''}
        options={serviceOptions}
        onChange={(event) => onService(event.target.value)}
      />
    </div>
  );
}
