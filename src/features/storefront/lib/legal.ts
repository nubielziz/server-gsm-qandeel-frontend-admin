// Helpers for the legal documents panel. Ports `lcols`, `publishLegal` and the "earlier versions" line of tabContent in
// 50-p-storefront.js. Which version is in force and what a publish does belong to the server; this only groups rows for
// the screen and suggests the next version number in the box.
import type { LegalDocument } from '../types';

/** The document names (the demo's types). The API column is plain text, so an unknown type is shown as it comes. */
const TYPE_LABEL: Record<string, string> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
  refund: 'Refund policy',
  cookies: 'Cookie policy',
};

/** The type menu of the New version form. */
export const LEGAL_TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));

/** The name of a document type, or the raw text for a type this console does not know. */
export function legalTypeLabel(type: string): string {
  return Object.hasOwn(TYPE_LABEL, type) ? TYPE_LABEL[type] : type;
}

/**
 * A version as the line of earlier versions names it: `Terms of service v3.2`. A version kept from before English became the
 * only language (decision 039) has another code in `locale`; it is marked with that code in capitals, `(retired TR text)`,
 * because the consents that point at it still prove what a person accepted.
 */
export function earlierVersionName(document: Pick<LegalDocument, 'type' | 'version' | 'locale'>): string {
  const name = `${legalTypeLabel(document.type)} v${document.version}`;
  return document.locale === 'en' ? name : `${name} (retired ${document.locale.toUpperCase()} text)`;
}

/**
 * The version number a new version could start from: `3.2` suggests `3.3` (the demo bumped the part after the dot).
 * Only a suggestion for the box; the server validates what is sent. A number in another shape gets ".1" added.
 */
export function suggestNextVersion(version: string): string {
  const match = /^(.*?)(\d+)$/.exec(version.trim());
  if (!match) return `${version.trim()}.1`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

/**
 * The next free version number of this document type over all its versions, drafts and earlier ones included: the one after the newest
 * version the document has (see `suggestNextVersion`), moved on while another version of the document holds it, or `1.0` for a
 * document with no version yet. Only a suggestion read from the rows the page has; the server checks the number and says so when it exists.
 */
export function nextVersionFor(
  documents: readonly Pick<LegalDocument, 'type' | 'version' | 'createdAt'>[],
  type: string,
): string {
  const own = documents.filter((document) => document.type === type);
  const newest = [...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!newest) return FIRST_VERSION;
  const held = new Set(own.map((document) => document.version.trim()));
  let next = suggestNextVersion(newest.version);
  // A cap keeps an odd row set from looping for ever; the server has the last word anyway.
  for (let tries = 0; held.has(next) && tries < 1000; tries += 1) next = suggestNextVersion(next);
  return next;
}

/** The first version of a document that has none yet. */
export const FIRST_VERSION = '1.0';

/** The rows of the legal table: what the table lists, split three ways, grouped by document inside each. */
export type LegalGroups = {
  /** The versions in force. */
  current: LegalDocument[];
  /** Written, not yet published. */
  drafts: LegalDocument[];
  /** Earlier versions, kept for the record. */
  earlier: LegalDocument[];
  /** The table's rows: versions in force and drafts together, so a draft sits above the version it will replace. */
  shown: LegalDocument[];
};

// Documents in the order of the type menu (terms first), then the newest version first.
function byDocument(a: LegalDocument, b: LegalDocument): number {
  const order = (type: string) => {
    const index = LEGAL_TYPE_OPTIONS.findIndex((option) => option.value === type);
    return index === -1 ? LEGAL_TYPE_OPTIONS.length : index;
  };
  return (
    order(a.type) - order(b.type) || a.type.localeCompare(b.type) || b.createdAt.localeCompare(a.createdAt)
  );
}

/** Splits the rows by the flags the server sent: `isCurrent`, and an empty `effectiveFrom` for a version not yet published. */
export function groupLegal(documents: readonly LegalDocument[]): LegalGroups {
  const pick = (test: (document: LegalDocument) => boolean) => documents.filter(test).sort(byDocument);
  return {
    current: pick((d) => d.isCurrent),
    drafts: pick((d) => !d.isCurrent && !d.effectiveFrom),
    earlier: pick((d) => !d.isCurrent && Boolean(d.effectiveFrom)),
    shown: pick((d) => d.isCurrent || !d.effectiveFrom),
  };
}

/** The version in force for the same document type, if any: what a publish replaces. */
export function versionInForce(
  documents: readonly LegalDocument[],
  document: Pick<LegalDocument, 'type'>,
): LegalDocument | undefined {
  return documents.find((d) => d.isCurrent && d.type === document.type);
}
