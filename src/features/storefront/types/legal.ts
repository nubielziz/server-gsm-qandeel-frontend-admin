// Types of the Content and legal tab's legal panel: a legal document version as `GET /admin/legal-documents` sends it
// and the body of the create endpoint. The shapes beyond the generated row (`legal_documents`) are assumed contracts
// (listed in HANDOFF.md).
import type { LegalDocumentRow } from '@/lib/api/schema.gen';

/** The document types of the demo (terms, privacy, refund, cookies). The API column is plain text. */
export const LEGAL_TYPES = ['terms', 'privacy', 'refund', 'cookies'] as const;
export type LegalType = (typeof LEGAL_TYPES)[number];

/**
 * One version of a legal document (assumed contract). The version in force has `isCurrent`; a version nobody has
 * published yet has no `effectiveFrom`. `acceptedCount` is how many times customers accepted it at checkout, `null`
 * when the server does not count.
 */
export type LegalDocument = Pick<
  LegalDocumentRow,
  | 'id'
  | 'type'
  | 'version'
  | 'locale'
  | 'bodyMd'
  | 'effectiveFrom'
  | 'isCurrent'
  | 'requiresReacceptance'
  | 'createdAt'
> & { acceptedCount: number | null };

/** Body of `POST /admin/legal-documents` (assumed contract): a new version, not yet in force until it is published. */
export type CreateLegalBody = {
  type: string;
  locale: string;
  version: string;
  bodyMd: string;
  requiresReacceptance: boolean;
};

/** What `GET /admin/legal-documents` filters by. */
export type LegalListFilters = {
  type?: string;
  locale?: string;
  isCurrent?: boolean;
};
