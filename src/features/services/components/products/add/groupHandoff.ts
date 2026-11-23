// groupHandoff: what passes between +Add Service and +Add Group when a person adds a group without leaving the job: the address of the +Add Group
// view with its return key, and the form's draft, kept in the session while the group is made. Pure storage and text; the views decide when to call it.
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { DELIVERY_UNITS } from '../../../lib/delivery';
import { productsPath } from '../../../lib/productsPath';
import { addServiceDefaults, type AddServiceValues } from './addServiceForm';

/** The address key that says the +Add Group view was opened from +Add Service, and the one value it takes. */
export const RETURN_KEY = 'return';
export const RETURN_TO_ADD = 'add' as const;

/**
 * The address of the +Add Group view of a kind, opened from +Add Service: the +Add Group address with the return key.
 * @see ../add-group/AddGroupView.tsx, which reads the key
 */
export function addGroupFromAddPath(type: ServiceType): string {
  return productsPath({ view: 'add-group', type, return: RETURN_TO_ADD });
}

// One draft per kind of service: the groups of a kind are the only ones its form offers.
const keyOf = (type: ServiceType) => `gsm-products-add-draft:${type}`;

// The session can be missing or blocked (private mode, a bare Node run): the draft is then simply not kept.
function load(key: string): string | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Nothing to do: the form just starts blank next time.
  }
}

/** Keeps the form's values in the session while the person adds a group. */
export function saveAddDraft(type: ServiceType, values: AddServiceValues): void {
  store(keyOf(type), JSON.stringify(values));
}

/**
 * The draft of a kind, or null when there is none. What the session holds is read as untrusted: a field of the wrong shape falls back to the
 * blank form's value, so a damaged draft can never put a non-text value in a box.
 */
export function readAddDraft(type: ServiceType): AddServiceValues | null {
  const raw = load(keyOf(type));
  if (raw === null) return null;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return null;
  const fields = new Map(Object.entries(saved));
  const blank = addServiceDefaults();
  const text = (key: 'name' | 'code' | 'categoryId' | 'verifyWindowH' | 'deliveryAmount' | 'credit') => {
    const value = fields.get(key);
    return typeof value === 'string' ? value : blank[key];
  };
  const flag = (key: 'active' | 'automatic' | 'verify' | 'cancel') => {
    const value = fields.get(key);
    return typeof value === 'boolean' ? value : blank[key];
  };
  const unit = DELIVERY_UNITS.find((choice) => choice.value === fields.get('deliveryUnit'));
  return {
    name: text('name'),
    code: text('code'),
    categoryId: text('categoryId'),
    active: flag('active'),
    automatic: flag('automatic'),
    verify: flag('verify'),
    verifyWindowH: text('verifyWindowH'),
    cancel: flag('cancel'),
    deliveryAmount: text('deliveryAmount'),
    deliveryUnit: unit?.value ?? blank.deliveryUnit,
    credit: text('credit'),
  };
}

/** Forgets the draft of a kind. */
export function clearAddDraft(type: ServiceType): void {
  store(keyOf(type), null);
}

/**
 * Chooses a group in the draft (the draft of the form the person left, or a blank one when there is none), so +Add Service opens with the
 * group that was just made already chosen.
 */
export function chooseDraftGroup(type: ServiceType, groupId: Id): void {
  saveAddDraft(type, { ...(readAddDraft(type) ?? addServiceDefaults()), categoryId: String(groupId) });
}
