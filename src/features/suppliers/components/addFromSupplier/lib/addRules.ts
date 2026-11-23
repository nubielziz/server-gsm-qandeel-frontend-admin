// The plain rules of the Add-from-supplier form: its two ways in, which suppliers can be chosen, how the page's kind narrows a supplier's
// groups, the body of the import, why the shop choice is locked and why Add waits. Pure, so the components only show what these return.
// The server decides what is added, in which group and at what price; nothing here works out a figure.
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { NO_RULE_REASON, RULE_LOADING_REASON, type ShopRule } from '../../../lib/quickAddFlow';
import { PUBLISH_SWITCHED_OFF } from '../../../lib/quickAddPublish';
import { MAX_QUICK_ADD_GROUPS } from '../../../lib/quickAdd';
import type { ImportBody, ImportServiceStatus, ServiceGroup, Supplier } from '../../../types';

/** The two ways in once a supplier is chosen: whole groups (the quick add run) or single services (the import). */
export type AddWay = 'groups' | 'services';

/** What the form's address state may name: a supplier to start from and the way in. */
export type AddInitial = { supplierId?: Id; from?: AddWay };

/** The permission that reads the connected suppliers (the Supplier menu). */
export const SUPPLIERS_READ = 'suppliers:read';

/** The permission both ways in need on the server, and what Add needs. */
export const CATALOG_CREATE = 'catalog:create';

/** The permission that reads the groups (categories) of the console, for the menu of single services. */
export const CATALOG_READ = 'catalog:read';

/** The words of the Service Listed In Group row for whole groups: the server names each group after the supplier's group. */
export const GROUPS_LISTED_WORDS = "Named after the supplier's group";

/** The first option of the group menu for single services: each service goes into the group named after its supplier group. */
export const SAME_AS_SUPPLIER = 'Same as at the supplier';

/** The hint under the Add switch, for each way. */
export const WAY_HINT: Readonly<Record<AddWay, string>> = {
  groups: 'Add every service of a group at once, in the background.',
  services: 'Pick services one by one and check their prices first.',
};

/** What the single-services path does when "Put on the shop" is Yes (one preview of the new services for each batch). */
export const SINGLES_SHOP_HINT =
  'After each batch the server prepares a shop preview of the services it added. Nothing goes on the shop until you review the preview and publish it.';

/** Why a supplier cannot be chosen, or `undefined` when it can. A switched off supplier takes no work, so none of its services are added. */
export function supplierBlock(supplier: Pick<Supplier, 'status'>): string | undefined {
  return supplier.status === 'disabled'
    ? 'Switch it on from the Suppliers page to add its services.'
    : undefined;
}

/** What a supplier is called in the menu: its name, and "switched off" when it cannot be chosen. */
export function supplierLabel(supplier: Pick<Supplier, 'name' | 'status'>): string {
  return supplierBlock(supplier) === undefined ? supplier.name : `${supplier.name} (switched off)`;
}

/**
 * The line the Supplier row shows when the opening address named a supplier the form cannot start from: one the list does not have,
 * or one that is switched off. `undefined` when the supplier is fine (or the address named none).
 */
export function startNotice(supplierId: Id | undefined, suppliers: readonly Supplier[]): string | undefined {
  if (supplierId === undefined) return undefined;
  const named = suppliers.find((supplier) => supplier.id === supplierId);
  if (!named) return 'That supplier is not among your connected suppliers. Pick one below.';
  if (supplierBlock(named) === undefined) return undefined;
  return `${named.name} is switched off, so its services cannot be added. Switch it on from the Suppliers page, or pick another supplier.`;
}

/** Whether a supplier's type text is the page's kind. The supplier writes its own spelling (`IMEI`, `imei`), so case and spaces do not count. */
export function matchesKind(type: string, kind: ServiceType): boolean {
  return type.trim().toLowerCase() === kind;
}

/** The groups of the page's kind: the only ones the form offers (a group of another kind belongs to another strip of the page). */
export function kindGroups(groups: readonly ServiceGroup[], kind: ServiceType): ServiceGroup[] {
  return groups.filter((group) => matchesKind(group.type, kind));
}

/**
 * The one exact type text the supplier uses for the page's kind, when its groups of that kind all spell it the same way: the list of
 * the supplier's services can then be narrowed to the kind by the server. `undefined` when the supplier has no group of the kind, or
 * spells it in more than one way (the list then shows rows of the kind only, a page at a time).
 */
export function kindTypeText(groups: readonly ServiceGroup[], kind: ServiceType): string | undefined {
  const spellings = new Set(kindGroups(groups, kind).map((group) => group.type));
  return spellings.size === 1 ? [...spellings][0] : undefined;
}

/** What the person chose for the new services of an import. */
export type ImportChoice = { status: ImportServiceStatus; categoryId: Id | null };

/**
 * The body of the import and of its preview for these supplier services. A key is sent only when it asks for something other than
 * the server's default: `status` for "Inactive", `categoryId` for a group of ours (decision 063).
 */
export function importBody(ids: Id[], choice: ImportChoice): ImportBody {
  return {
    supplierServiceIds: ids,
    ...(choice.status === 'disabled' ? { status: choice.status } : {}),
    ...(choice.categoryId !== null ? { categoryId: choice.categoryId } : {}),
  };
}

/** What decides the shop choice: the way in, the status the services are added in, the permissions and what is known about the rules. */
export type ShopLockInput = {
  way: AddWay;
  status: ImportServiceStatus;
  can: (permission: string) => boolean;
  rule: ShopRule;
};

/**
 * The reason "Put on the shop" cannot be Yes, or `undefined` when it can. Inactive services come first (a switched off service can never
 * be listed), then the wait for what is still being read (the staff member's permissions and the shop price rules are one question
 * until both are known), then a role that may not start what the way needs (a quick add that publishes needs `storefront:publish`, a shop
 * preview for single services needs `storefront:create`), then no active rule. A rule that cannot be read does not lock: the server checks
 * it when the work starts.
 */
export function shopLock({ way, status, can, rule }: ShopLockInput): string | undefined {
  if (status === 'disabled') return PUBLISH_SWITCHED_OFF;
  if (rule === 'loading') return RULE_LOADING_REASON;
  const permission = way === 'groups' ? 'storefront:publish' : 'storefront:create';
  if (!can(permission)) return `You need the ${permission} permission`;
  if (rule === 'none') return NO_RULE_REASON;
  return undefined;
}

/** Whether the shop choice shows Yes: never while locked; otherwise what the person chose, and before that on when a rule is known to be active. */
export function shopIsOn(lock: string | undefined, rule: ShopRule, choice: boolean | null): boolean {
  if (lock !== undefined) return false;
  return choice ?? rule === 'active';
}

/** What decides whether Add can be pressed. */
export type AddBlockInput = {
  /** `catalog:create`, as the grants hook's `needs` gives it. */
  permission: { disabled: boolean; title?: string };
  supplierChosen: boolean;
  way: AddWay;
  /** How many groups or services are picked. */
  picked: number;
  /** More groups are picked than one request can name. */
  tooMany: boolean;
  /** A run of this supplier is going (whole groups only). */
  live: boolean;
  /** The server's preview says every picked service is in the console already (single services only). */
  nothingToAdd: boolean;
  needsConfirm: boolean;
  confirmed: boolean;
};

/** Why Add cannot be pressed now, in words (also its title), or `undefined` when it can. */
export function addBlock(input: AddBlockInput): string | undefined {
  if (input.permission.disabled) return input.permission.title;
  if (!input.supplierChosen) return 'Pick a supplier first.';
  if (input.way === 'groups' && input.live) return 'A quick add for this supplier is already running.';
  if (input.picked === 0)
    return input.way === 'groups' ? 'Pick at least one group.' : 'Pick at least one service.';
  if (input.tooMany) return `Pick at most ${MAX_QUICK_ADD_GROUPS} groups, or all of them.`;
  if (input.nothingToAdd) return 'Everything picked is in the console already.';
  if (input.needsConfirm && !input.confirmed) return 'Tick the box above to confirm.';
  return undefined;
}
