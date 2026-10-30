// The command palette's supplier search: type part of a name and get up to five suppliers, each opening the Suppliers page
// with that supplier selected. The demo's palette only had the page itself; the server does the matching (`q` on
// `GET /admin/suppliers`).
import type { PaletteSource } from '@/app/palette';
import { listSuppliers } from '../api';
import { driverLabel } from './connection';
import { supplierPath } from './paths';
import { STATE_BADGE, supplierState } from './state';

/** Most suppliers the palette lists. */
export const PALETTE_SUPPLIER_LIMIT = 5;

/** Searches suppliers by name on the server and opens the Suppliers page on the chosen one. */
export const suppliersPaletteSource: PaletteSource = {
  id: 'suppliers',
  group: 'Suppliers',
  permission: 'suppliers:read',
  async search(query, signal, go) {
    const { data } = await listSuppliers(
      { q: query.trim(), start: 0, end: PALETTE_SUPPLIER_LIMIT, sort: ['name'], order: ['asc'] },
      { signal },
    );
    return data.map((supplier) => ({
      id: `supplier:${supplier.id}`,
      label: supplier.name,
      hint: `${driverLabel(supplier.driver)} · ${STATE_BADGE[supplierState(supplier)].label}`,
      icon: 'server' as const,
      run: () => go(supplierPath(supplier.id)),
    }));
  },
};
