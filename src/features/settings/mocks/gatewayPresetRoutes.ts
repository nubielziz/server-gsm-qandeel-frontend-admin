// Mock of the routes feature 32 adds to the payment methods (backend B232): the catalog of ready-made methods
// (`GET /admin/payment-gateway-presets`) and the logo of a method (`POST` and `DELETE /admin/payment-gateways/:id/logo`).
// The logo routes play the server's refusals: 415 for a body that is not multipart, 422 on `file` for a missing or wrong picture, 413 over 2 MiB,
// 404 for an unknown method. A delete answers 204 also when there was no logo.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { PRESET_CATALOG } from './gatewayPresets';
import { invalid, notFound, signedIn } from './http';
import { filePartOf } from './multipart';
import { settingsFeatureStore } from './store';

const LOGO_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** An address for an uploaded logo: an object URL in the browser, a made-up media path where there is none (tests). */
function logoUrlOf(file: { type: string; bytes: Uint8Array }, gatewayId: unknown): string {
  if (typeof URL.createObjectURL === 'function')
    return URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.type }));
  return `/store/v1/media/mock-logo-${String(gatewayId)}-${Date.now()}.${LOGO_TYPES.get(file.type) ?? 'png'}`;
}

/** The catalog and logo routes. */
export const gatewayPresetRoutes: HttpHandler[] = [
  http.get('*/admin/payment-gateway-presets', ({ request }) =>
    signedIn(request, () => HttpResponse.json(PRESET_CATALOG)),
  ),

  http.post('*/admin/payment-gateways/:id/logo', ({ request, params }) =>
    signedIn(request, async () => {
      const { gateways } = await settingsFeatureStore();
      const row = gateways.find(String(params.id));
      if (!row) return notFound('payment gateway', params.id);
      if (!(request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
        return problem(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Unsupported media type',
          'Send the logo as multipart/form-data.',
        );
      }
      const file = await filePartOf(request);
      if (!file) return invalid([{ field: 'file', message: 'Choose a picture to upload.' }]);
      if (file.bytes.length > LOGO_MAX_BYTES)
        return problem(413, 'PAYLOAD_TOO_LARGE', 'Logo too large', 'A logo can be at most 2 MiB.');
      if (!LOGO_TYPES.has(file.type))
        return invalid([{ field: 'file', message: 'Use a JPEG, PNG or WebP picture.' }]);
      return HttpResponse.json(gateways.patch(row.id, { logoUrl: logoUrlOf(file, row.id) }) ?? row);
    }),
  ),

  http.delete('*/admin/payment-gateways/:id/logo', ({ request, params }) =>
    signedIn(request, async () => {
      const { gateways } = await settingsFeatureStore();
      const row = gateways.find(String(params.id));
      if (!row) return notFound('payment gateway', params.id);
      gateways.patch(row.id, { logoUrl: null });
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
