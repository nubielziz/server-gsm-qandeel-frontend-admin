// The command palette's service search: type a name or a code and get up to five services, each opening the Services tab
// filtered by that name. Ports the services part of paletteItems(q) in 90-app.js; the server does the matching (`q` on
// `GET /admin/services`) instead of the browser scanning every service.
import type { PaletteSource } from '@/app/palette';
import { listServices } from '../api';
import { servicesListPath } from './paths';

/** Most services the palette lists (the demo's limit). */
export const PALETTE_SERVICE_LIMIT = 5;

/** Searches the services on the server for the palette; opens the Services tab filtered by the chosen name. */
export const servicesPaletteSource: PaletteSource = {
  id: 'services',
  group: 'Services',
  permission: 'catalog:read',
  async search(query, signal, go) {
    const { data } = await listServices(
      { q: query.trim(), start: 0, end: PALETTE_SERVICE_LIMIT, sort: ['name'], order: ['asc'] },
      { signal },
    );
    return data.map((service) => ({
      id: `service:${service.id}`,
      label: service.name,
      hint: service.code,
      icon: 'tag' as const,
      run: () => go(servicesListPath({ q: service.name })),
    }));
  },
};
