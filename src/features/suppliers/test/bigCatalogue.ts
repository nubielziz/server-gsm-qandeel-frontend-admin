// Test helper: makes a supplier's service list long (many pages, more than 500 services not imported yet) without adding
// anything to the shipped mock seed. Call it before opening the page; import it from tests only.
import { suppliersState } from '../mocks';

/**
 * Adds `count` services to a supplier's list, none imported, named "Bulk 0001", "Bulk 0002"… in group "Bulk" (type IMEI), and
 * returns their ids in that order. In the name order the picker uses they sit between "Blacklist Status (GSMA)" and "EE UK Unlock".
 */
export async function addNotImported(supplierId: number, count: number): Promise<number[]> {
  const state = await suppliersState();
  const lastSeenAt = new Date().toISOString();
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(4, '0');
    return state.catalogue.insert({
      supplierId,
      remoteId: `B${supplierId}-${number}`,
      remoteGroup: 'Bulk',
      type: 'imei',
      name: `Bulk ${number}`,
      credit: '1.0000',
      time: '1 hour',
      isAvailable: true,
      lastSeenAt,
      priceChangedAt: null,
      imported: false,
      linkedServiceId: null,
      previousCredit: null,
    }).id;
  });
}
