// Saving the edited prices of the grid, row by row, through the routes that already exist: the base price through the service update
// (`PATCH /admin/services/:id`) and the rank and shop prices through the group prices replace (`PUT /admin/services/:id/group-prices`).
// A refused row keeps its edits: the answer says, per cell, what was saved and what the server refused in its own words. Nothing is
// worked out here; the server judges every price.
import { isApiError, type ApiError, type Id } from '@/lib/api';
import { useApiMutation } from '@/lib/query';
import { replaceServiceGroupPrices, updateService } from '../api';
import {
  refusalOfBase,
  refusalOfPrices,
  type CellNotes,
  type GridCell,
  type Refusals,
  type RowPlan,
  type SavePlan,
} from '../lib/priceGrid';
import { SERVICE_STALE_KEYS, staleServices } from './keys';

/** What happened to one row: the cells that were saved, and the cells the server refused with its words. */
export type RowOutcome = { id: Id; saved: GridCell[]; refused: Refusals };

/** What a save did: one outcome per row sent, and the problems found before sending (those rows sent nothing). */
export type GridSaveResult = { rows: RowOutcome[]; problems: CellNotes };

// A failed call becomes the cells' words; a signed-out session (401) or anything that is not an API answer goes on to the default handling.
function refusalFor(error: unknown, words: (error: ApiError) => Refusals): Refusals {
  if (!isApiError(error) || error.status === 401) throw error;
  return words(error);
}

// The base price first (the shop floor starts from it), then the group prices. A refused base price does not stop the group prices.
async function sendRow(plan: RowPlan): Promise<RowOutcome> {
  const saved: GridCell[] = [];
  const refused: Refusals = {};
  const { row, base, prices } = plan;
  if (base) {
    try {
      await updateService(row.id, { basePrice: base.price });
      saved.push('base');
    } catch (error) {
      Object.assign(refused, refusalFor(error, refusalOfBase));
    }
  }
  if (prices) {
    try {
      await replaceServiceGroupPrices(row.id, prices.body);
      saved.push(...prices.changed);
    } catch (error) {
      Object.assign(
        refused,
        refusalFor(error, (answer) => refusalOfPrices(answer, prices)),
      );
    }
  }
  return { id: row.id, saved, refused };
}

/**
 * Sends the plan, one row after the other (a row's two calls never overlap with another row's), and says per cell what was saved.
 * Side effects: `PATCH /admin/services/:id` and `PUT /admin/services/:id/group-prices` for each row that has something to send, the toast
 * when something was saved, and the refresh of the services reads.
 */
export function useSavePriceGrid() {
  return useApiMutation({
    mutationFn: async (plan: SavePlan): Promise<GridSaveResult> => {
      const rows: RowOutcome[] = [];
      for (const rowPlan of plan.rows) rows.push(await sendRow(rowPlan));
      return { rows, problems: plan.problems };
    },
    invalidates: (result) =>
      staleServices(...result.rows.filter((row) => row.saved.length > 0).map((row) => row.id)),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (result) => {
      const saved = result.rows.filter((row) => row.saved.length > 0).length;
      if (saved === 0) return false;
      return {
        message: `${saved} ${saved === 1 ? 'service' : 'services'} saved`,
        description: 'New orders use the new prices.',
      };
    },
  });
}
