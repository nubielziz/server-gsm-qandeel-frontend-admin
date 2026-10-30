// Mock of the legal document routes (`/admin/legal-documents*`): list, one version, write a version and publish it. The mock plays
// the server: a version number is unique per document and language, a new version is not in force, and publishing makes it the
// current one and retires the one it replaces. The real server would also record who approved it (`audit_logs`).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toIso } from '@/mocks/seed';
import {
  bodyOf,
  conflict,
  invalid,
  listAnswer,
  LOCALES,
  notFound,
  rawTextOf,
  signedIn,
  textOf,
} from './http';
import { storefrontStore } from './store';

const SEARCH_FIELDS = ['type', 'version'];
const TYPES = ['terms', 'privacy', 'refund', 'cookies'];

/** The legal document routes. */
export const legalRoutes: HttpHandler[] = [
  http.post('*/admin/legal-documents/:id/publish', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const document = stores.legal.find(String(params.id));
      if (!document) return notFound('legal document', params.id);
      if (document.isCurrent) {
        return conflict(
          'ALREADY_CURRENT',
          'Already in force',
          `Version ${document.version} is already in force.`,
        );
      }
      for (const other of stores.legal.list()) {
        if (other.isCurrent && other.type === document.type && other.locale === document.locale) {
          stores.legal.patch(other.id, { isCurrent: false });
        }
      }
      return HttpResponse.json(
        stores.legal.patch(document.id, { isCurrent: true, effectiveFrom: toIso(Date.now()) }),
      );
    }),
  ),

  http.get('*/admin/legal-documents', ({ request }) =>
    signedIn(request, async () => listAnswer((await storefrontStore()).legal.list(), request, SEARCH_FIELDS)),
  ),

  http.get('*/admin/legal-documents/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const document = (await storefrontStore()).legal.find(String(params.id));
      return document ? HttpResponse.json(document) : notFound('legal document', params.id);
    }),
  ),

  http.post('*/admin/legal-documents', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const type = textOf(body.type);
      const locale = textOf(body.locale);
      const version = textOf(body.version);
      const bodyMd = rawTextOf(body.bodyMd);
      const errors = [];
      if (!TYPES.includes(type)) errors.push({ field: 'type', message: 'Choose a document.' });
      if (!LOCALES.includes(locale)) errors.push({ field: 'locale', message: 'Choose a language.' });
      if (!version) errors.push({ field: 'version', message: 'Enter a version number.' });
      if (!bodyMd.trim()) errors.push({ field: 'bodyMd', message: 'Enter the text of the document.' });
      if (errors.length > 0) return invalid(errors);
      const same = stores.legal
        .list()
        .find((d) => d.type === type && d.locale === locale && d.version === version);
      if (same) {
        const message = `Version ${version} already exists for this document.`;
        return conflict('VERSION_EXISTS', 'Version already exists', message, [{ field: 'version', message }]);
      }
      const document = stores.legal.insert({
        type,
        locale,
        version,
        bodyMd,
        effectiveFrom: null,
        isCurrent: false,
        requiresReacceptance: body.requiresReacceptance !== false,
        createdAt: toIso(Date.now()),
        acceptedCount: null,
      });
      return HttpResponse.json(document, { status: 201 });
    }),
  ),
];
