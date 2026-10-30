// The supplier report (`GET /admin/reports/suppliers`) that adds spend, rejection rate and speed to the detail of a
// supplier. It belongs to the growth route group but only this page reads it. Needs `reports:read`.
import { apiGet, type ApiInit } from '@/lib/api';
import type { SupplierReportQuery, SupplierReportRow } from '../types';

/**
 * How much each supplier cost, how many of its orders were rejected and how fast it answered, over the last `days`
 * days (7 when left out). The page shows the row of the supplier it has open.
 * Assumed contract: query `days`, answer one `SupplierReportRow` per supplier.
 * @route GET /admin/reports/suppliers
 */
export function getSupplierReport(
  query: SupplierReportQuery = {},
  init?: ApiInit,
): Promise<SupplierReportRow[]> {
  return apiGet<SupplierReportRow[]>('/admin/reports/suppliers', query, init);
}
