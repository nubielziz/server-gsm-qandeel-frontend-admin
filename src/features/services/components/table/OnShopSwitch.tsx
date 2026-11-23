// OnShopSwitch: the one "On the shop" switch of a service, shared by the table's On shop cell and the panel's Shop page section. Both
// draw ShopCell over the same runner (usePutOnShop), held once by the Catalog table view, so a press in one place shows busy in the
// other and a second press anywhere cannot start a second run.
import { createContext, useContext, type ReactNode } from 'react';
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import { usePutOnShop } from '../../hooks/usePutOnShop';
import type { Service } from '../../types';
import { ShopCell } from './ShopCell';

type ShopSwitchRunner = ReturnType<typeof usePutOnShop>;

const ShopSwitchContext = createContext<ShopSwitchRunner | null>(null);

/** Holds the one switch runner for everything under it (the table and the open service's panel). */
export function ShopSwitchProvider({ children }: { children: ReactNode }) {
  const runner = usePutOnShop();
  return <ShopSwitchContext.Provider value={runner}>{children}</ShopSwitchContext.Provider>;
}

export interface OnShopSwitchProps {
  service: Service;
  grants: ServiceGrants;
}

/** The switch and its word for one service. Mount it under a ShopSwitchProvider. */
export function OnShopSwitch({ service, grants }: OnShopSwitchProps) {
  const runner = useContext(ShopSwitchContext);
  if (!runner) throw new Error('OnShopSwitch needs a ShopSwitchProvider above it.');
  return (
    <ShopCell service={service} grants={grants} busy={runner.isBusy(service.id)} onToggle={runner.toggle} />
  );
}
