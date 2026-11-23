// Everything the Add-from-supplier form shows and does: the supplier and the way in, the choices (group, status, shop) and the two paths. It
// reads the connected suppliers, the chosen supplier's groups, the groups of ours with the page's kind and whether a shop price rule is
// active, and works out why Add waits. The components only draw what this returns.
import { useState } from 'react';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { useServiceGroups } from '../../../hooks/useQuickAdd';
import { useSupplierGrants } from '../../../hooks/useSupplierGrants';
import { useSuppliers } from '../../../hooks/useSuppliers';
import type { ImportServiceStatus } from '../../../types';
import {
  addBlock,
  CATALOG_CREATE,
  CATALOG_READ,
  kindGroups,
  kindTypeText,
  shopIsOn,
  shopLock,
  startNotice,
  supplierBlock,
  SUPPLIERS_READ,
  type AddInitial,
  type AddWay,
  type ImportChoice,
} from '../lib/addRules';
import { useGroupsAdd } from './useGroupsAdd';
import { useKindCategories } from './useKindCategories';
import { useShopRule } from './useShopRule';
import { useSinglesAdd } from './useSinglesAdd';

/** What the form takes: the page's kind, where the address says to start, and who to tell when services were added. */
export type AddFromSupplierArgs = {
  type: ServiceType;
  initial?: AddInitial;
  onDone: (createdIds: Id[]) => void;
};

/** What the form components receive. */
export type AddState = ReturnType<typeof useAddFromSupplier>;

/**
 * The state of the form for one kind of service (the form is mounted again when the kind changes, so a pick never crosses kinds).
 * Choosing another supplier forgets the picks and the result of the first. `locked` is true while an import that stopped part-way waits to be
 * continued: its status, group and shop choice stay as they were.
 */
export function useAddFromSupplier({ type, initial, onDone }: AddFromSupplierArgs) {
  const grants = useSupplierGrants();
  const suppliersLock = grants.needs(SUPPLIERS_READ);
  const suppliers = useSuppliers({ enabled: grants.ready && !suppliersLock.disabled });
  const [supplierId, setSupplierId] = useState<Id | null>(initial?.supplierId ?? null);
  const [way, setWay] = useState<AddWay>(initial?.from ?? 'groups');
  const [status, setStatus] = useState<ImportServiceStatus>('active');
  const [categoryId, setCategoryId] = useState<Id | null>(null);
  // null until the person touches "Put on the shop": then its default (Yes with an active rule) applies.
  const [shopChoice, setShopChoice] = useState<boolean | null>(null);

  const named = suppliers.suppliers.find((candidate) => candidate.id === supplierId);
  const supplier = named && supplierBlock(named) === undefined ? named : undefined;
  const notice =
    suppliers.status === 'ready' && supplierId !== null && !supplier
      ? startNotice(supplierId, suppliers.suppliers)
      : undefined;

  const groupsQuery = useServiceGroups(supplier?.id);
  const everyGroup = groupsQuery.data?.groups ?? [];
  const kindList = kindGroups(everyGroup, type);
  const categoriesLock = grants.needs(CATALOG_READ);
  const categories = useKindCategories(type, grants.ready && way === 'services' && !categoriesLock.disabled);

  const rule = useShopRule(grants.ready, grants.can('pricing:read'));
  const choice: ImportChoice = { status, categoryId };
  const lock = shopLock({ way, status, can: grants.can, rule });
  const shop = shopIsOn(lock, rule, shopChoice);

  const groups = useGroupsAdd({ supplier, groups: groupsQuery, type, status, shop, onDone });
  const singles = useSinglesAdd({
    supplier: way === 'services' && kindList.length > 0 ? supplier : undefined,
    kindType: kindTypeText(everyGroup, type),
    kind: type,
    choice,
    shop,
    onDone,
  });
  const locked = way === 'services' && singles.resuming;

  const block = addBlock({
    permission: grants.needs(CATALOG_CREATE),
    supplierChosen: supplier !== undefined,
    way,
    picked: way === 'groups' ? groups.picked.groups : singles.selection.selected.size,
    tooMany: way === 'groups' && groups.picked.tooMany,
    live: groups.live,
    nothingToAdd: way === 'services' && singles.nothingToAdd,
    needsConfirm: way === 'groups' && groups.needsConfirm,
    confirmed: groups.confirmed,
  });

  return {
    type,
    grants,
    suppliers,
    suppliersLock,
    supplier,
    notice,
    way,
    setWay,
    status,
    setStatus,
    categoryId,
    setCategoryId,
    categories,
    categoriesLock,
    groupsQuery,
    kindList,
    /** "Put on the shop": what it shows, whether it is Yes, why it is locked, and the change. */
    shop: { on: shop, lock, rule, setChoice: setShopChoice },
    groups,
    singles,
    locked,
    block,
    adding: way === 'groups' ? groups.adding : singles.adding,
    /** Chooses a supplier (or none); what was picked for the one before is forgotten. */
    chooseSupplier(id: Id | null) {
      setSupplierId(id);
      groups.reset();
      singles.reset();
    },
    submit: () => (way === 'groups' ? groups.begin() : singles.begin()),
  };
}
