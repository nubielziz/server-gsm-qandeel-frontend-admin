// What the connect and edit forms accept and send: cleaning typed text, the shape checks that only help the person typing, the
// money text for the alert amount, and which fields of an edit really changed. The server validates everything again.
import type { Money } from '@/lib/api';
import type { CreateSupplierBody, Supplier, UpdateSupplierBody } from '../types';
import { BASE_CURRENCY, NEW_SUPPLIER_DRIVER } from './connection';

/**
 * What the connection form holds. Numbers and money stay as typed text until they are sent. There is no API type and no currency: a new
 * supplier is sent the Dhru driver and the base currency, and an edit sends neither (decision 035).
 */
export type SupplierFormValues = {
  name: string;
  baseUrl: string;
  username: string;
  apiKey: string;
  lowBalanceAlert: string;
  maxConcurrency: string;
  rateLimitPerMin: string;
  timeoutMs: string;
};

/** The form's field names, so a server message about any other field still shows in the dialog's error slot. */
export const SUPPLIER_FIELDS = [
  'name',
  'baseUrl',
  'username',
  'apiKey',
  'lowBalanceAlert',
  'maxConcurrency',
  'rateLimitPerMin',
  'timeoutMs',
] as const;

/** A name with the spaces tidied: trimmed, and every run of spaces made one. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** A rough check that this is a web address (http or https, with a host); the server decides what it can reach. */
export function validBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname !== '';
  } catch {
    return false;
  }
}

/** The base URL as it is stored: trimmed, without a trailing slash. */
export function cleanBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Whether text is a whole number of at least one (empty is allowed by the caller, not here). */
export function isPositiveInt(text: string): boolean {
  return /^\d+$/.test(text.trim()) && Number(text) >= 1;
}

/**
 * Money typed as `150`, `150.5` or `150.5000` as the API's 4-decimal string, or null when it is not an amount. This pads
 * the text and does no arithmetic, so no rounding can creep in.
 */
export function moneyText(text: string): Money | null {
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(text.trim());
  return match ? `${match[1]}.${(match[2] ?? '').padEnd(4, '0')}` : null;
}

/** Whether a limit or amount left empty counts as "not given": the server keeps its default or the old value. */
const filled = (text: string): boolean => text.trim() !== '';

/** What the server uses for the four inputs of the "More options" fold when they are left empty. */
export const SUPPLIER_DEFAULTS = {
  lowBalanceAlert: 150,
  maxConcurrency: 5,
  rateLimitPerMin: 60,
  timeoutMs: 15000,
} as const;

/** True when a stored supplier holds a value in a folded input that is not the default, so "Edit connection" starts with the fold open. */
export function hasCustomLimits(
  supplier: Pick<Supplier, 'lowBalanceAlert' | 'maxConcurrency' | 'rateLimitPerMin' | 'timeoutMs'>,
): boolean {
  return (
    Number(supplier.lowBalanceAlert) !== SUPPLIER_DEFAULTS.lowBalanceAlert ||
    supplier.maxConcurrency !== SUPPLIER_DEFAULTS.maxConcurrency ||
    supplier.rateLimitPerMin !== SUPPLIER_DEFAULTS.rateLimitPerMin ||
    supplier.timeoutMs !== SUPPLIER_DEFAULTS.timeoutMs
  );
}

/** The body of Connect: the cleaned fields, with the optional limits left out when empty. */
export function toCreateBody(values: SupplierFormValues): CreateSupplierBody {
  const alert = moneyText(values.lowBalanceAlert);
  return {
    name: cleanName(values.name),
    driver: NEW_SUPPLIER_DRIVER,
    baseUrl: cleanBaseUrl(values.baseUrl),
    username: values.username.trim(),
    apiKey: values.apiKey.trim(),
    currency: BASE_CURRENCY,
    ...(alert ? { lowBalanceAlert: alert } : {}),
    ...(filled(values.maxConcurrency) ? { maxConcurrency: Number(values.maxConcurrency) } : {}),
    ...(filled(values.rateLimitPerMin) ? { rateLimitPerMin: Number(values.rateLimitPerMin) } : {}),
    ...(filled(values.timeoutMs) ? { timeoutMs: Number(values.timeoutMs) } : {}),
  };
}

/** The form's starting values for editing a supplier. The key stays empty: it is never shown again. */
export function valuesOf(supplier: Supplier): SupplierFormValues {
  return {
    name: supplier.name,
    baseUrl: supplier.baseUrl,
    username: supplier.username,
    apiKey: '',
    lowBalanceAlert: supplier.lowBalanceAlert,
    maxConcurrency: String(supplier.maxConcurrency),
    rateLimitPerMin: String(supplier.rateLimitPerMin),
    timeoutMs: String(supplier.timeoutMs),
  };
}

/**
 * The fields of an edit that really changed (never the API type or the currency: the form has no input for them). An empty key means
 * "keep the current one". An alert amount is compared as a
 * number only to see whether the text means the same amount as before (`150` and `150.0000`), never to decide anything.
 * An empty result means nothing changed.
 */
export function changedFields(supplier: Supplier, values: SupplierFormValues): UpdateSupplierBody {
  const next = toCreateBody(values);
  const body: UpdateSupplierBody = {};
  if (next.name !== supplier.name) body.name = next.name;
  if (next.baseUrl !== supplier.baseUrl) body.baseUrl = next.baseUrl;
  if (next.username !== supplier.username) body.username = next.username;
  if (next.apiKey) body.apiKey = next.apiKey;
  if (next.lowBalanceAlert && Number(next.lowBalanceAlert) !== Number(supplier.lowBalanceAlert)) {
    body.lowBalanceAlert = next.lowBalanceAlert;
  }
  if (next.maxConcurrency !== undefined && next.maxConcurrency !== supplier.maxConcurrency) {
    body.maxConcurrency = next.maxConcurrency;
  }
  if (next.rateLimitPerMin !== undefined && next.rateLimitPerMin !== supplier.rateLimitPerMin) {
    body.rateLimitPerMin = next.rateLimitPerMin;
  }
  if (next.timeoutMs !== undefined && next.timeoutMs !== supplier.timeoutMs) body.timeoutMs = next.timeoutMs;
  return body;
}
