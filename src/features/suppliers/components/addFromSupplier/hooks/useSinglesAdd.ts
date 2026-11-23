// The single-services path of the Add-from-supplier form: the supplier's own services with a search and a group, the picks (also across pages
// and through "Check All"), the server's preview of what adding them does, and the import that goes 500 at a time. The server classifies
// every item and suggests the price; the console works out nothing. It tells the page behind once for each answer that created services.
import { useEffect, useRef, useState } from 'react';
import { useRowSelection, type RowSelection } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { previewImport } from '../../../api';
import { useBatchedMutation } from '../../../hooks/useBatchedMutation';
import { NO_ERROR_TOAST } from '../../../hooks/useImportServices';
import { useSelectAllNotImported } from '../../../hooks/useSelectAllNotImported';
import { useSupplierCatalogue } from '../../../hooks/useSupplierCatalogue';
import { importableIds, mergePreviews, type RunState } from '../../../lib/importPlan';
import type { ImportPreview, ImportPreviewItem, Supplier } from '../../../types';
import { importBody, type ImportChoice } from '../lib/addRules';
import { describeFailure, plainFailure, type AddFailure } from '../lib/failures';
import { useServicesFilter } from './useServicesFilter';
import { useSinglesImport } from './useSinglesImport';

/** What the single-services path needs from the form. */
export type SinglesAddArgs = {
  /** The supplier whose services are listed; `undefined` while none is chosen, the way is not this one, or it has nothing of the kind. */
  supplier: Supplier | undefined;
  /** The exact type text the list is narrowed to on the server (see `kindTypeText`), or `undefined`. */
  kindType: string | undefined;
  /** The page's kind: where the server cannot narrow the list to it (`kindType` is `undefined`), "Check All" keeps to services of this kind. */
  kind: ServiceType;
  choice: ImportChoice;
  /** "Put on the shop" is Yes: each batch that creates services starts a shop preview. */
  shop: boolean;
  onDone: (createdIds: Id[]) => void;
};

/** What the path shows and does. */
export type SinglesAdd = {
  filter: ReturnType<typeof useServicesFilter>;
  selection: RowSelection<Id>;
  list: ReturnType<typeof useSupplierCatalogue>;
  all: ReturnType<typeof useSelectAllNotImported>;
  /** The server's preview of exactly the services picked now (and the choices made now); `null` until asked for, or once the picks changed. */
  items: ImportPreviewItem[] | null;
  previewing: boolean;
  /** Where the preview is while a long list goes 500 at a time, when it is for the picks on screen (else null). */
  previewRun: RunState | null;
  /** The ids the import would send: the new and changed items of the preview when it is current, else the picks. */
  ids: Id[];
  /** The preview says every picked service matches one in the console already: there is nothing to add. */
  nothingToAdd: boolean;
  importer: ReturnType<typeof useSinglesImport>;
  /** The import is not over: some batch was answered, the list is the same, and some are left. The choices stay as they were meanwhile. */
  resuming: boolean;
  /** Every batch of the last run was answered. */
  done: boolean;
  failure: AddFailure | null;
  /** A preview or an import call is going. */
  adding: boolean;
  preview: () => Promise<void>;
  begin: () => Promise<void>;
  /** Forgets the picks, the preview and the filter (another supplier was chosen). */
  reset: () => void;
};

/** What a preview is for: the picks and the choices that shape what a new service becomes. */
const previewKey = (picks: readonly Id[], choice: ImportChoice) =>
  JSON.stringify([picks, choice.status, choice.categoryId]);

/**
 * The single-services path. Nothing is read while `supplier` is `undefined`. The preview is asked for by a button, not at every tick, since a
 * long list goes 500 at a time; it is current only for the picks and choices it was made for, and the import sends what it says is new or
 * changed. Without a current preview the import sends the picks as they are: the server skips what matches.
 */
export function useSinglesAdd({
  supplier,
  kindType,
  kind,
  choice,
  shop,
  onDone,
}: SinglesAddArgs): SinglesAdd {
  const selection = useRowSelection<Id>();
  const filter = useServicesFilter();
  const [failure, setFailure] = useState<AddFailure | null>(null);
  const [preview, setPreview] = useState<{ key: string; items: ImportPreviewItem[] } | null>(null);
  const [done, setDone] = useState(false);
  const [settled, setSettled] = useState(0);
  const announced = useRef(new Set<Id>());
  const supplierId = supplier?.id;

  const list = useSupplierCatalogue({
    supplierId,
    page: filter.page,
    pageSize: filter.pageSize,
    q: filter.q,
    onlyNew: filter.onlyNew,
    group: filter.group,
    type: kindType,
  });
  const all = useSelectAllNotImported({
    supplierId,
    q: filter.q,
    group: filter.group,
    type: kindType,
    kind,
    selection,
    onError: (text) => setFailure(text === null ? null : plainFailure(text)),
  });
  const previewer = useBatchedMutation<Id, ImportPreview, ImportPreviewItem[]>({
    send: (batch) => previewImport(supplierId ?? 0, importBody(batch, choice)),
    merge: mergePreviews,
    errorNotification: NO_ERROR_TOAST,
  });
  const importer = useSinglesImport(supplierId ?? 0, choice, shop);

  const picks = [...selection.selected];
  const key = previewKey(picks, choice);
  const items = preview !== null && preview.key === key ? preview.items : null;
  const ids = items ? importableIds(items) : picks;
  const resuming =
    importer.answers.length > 0 && !done && importer.progressFor(ids) !== null && !importer.isPending;

  // The page behind is told once for each service the server created, as soon as a run ended (a stopped run that added some counts too).
  useEffect(() => {
    if (settled === 0) return;
    const created = [...importer.earlier, ...importer.answers].flatMap(
      (outcome) => outcome.result.createdServiceIds ?? [],
    );
    const fresh = created.filter((id) => !announced.current.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) announced.current.add(id);
    onDone(fresh);
  }, [settled, importer.answers, importer.earlier, onDone]);

  return {
    filter,
    selection,
    list,
    all,
    items,
    previewing: previewer.isPending,
    previewRun: previewer.progressFor(picks),
    ids,
    nothingToAdd: items !== null && ids.length === 0,
    importer,
    resuming,
    done,
    failure,
    adding: previewer.isPending || importer.isPending,
    async preview() {
      if (previewer.isPending || importer.isPending || all.busy || picks.length === 0) return;
      setFailure(null);
      try {
        setPreview({ key, items: await previewer.run(picks) });
      } catch (error) {
        setFailure(describeFailure(error, 'previewed'));
      }
    },
    async begin() {
      if (previewer.isPending || importer.isPending || all.busy || ids.length === 0) return;
      setFailure(null);
      // A list that differs from the run on screen starts another run: the answers of the first stay in the result.
      if (importer.answers.length > 0 && importer.progressFor(ids) === null) importer.keep();
      setDone(false);
      try {
        await importer.run(ids);
        setDone(true);
        // What was added leaves the picks, so a second press cannot send it again; its result stays on screen.
        selection.clear();
      } catch (error) {
        setFailure(describeFailure(error, 'added'));
      } finally {
        setSettled((count) => count + 1);
      }
    },
    reset() {
      selection.clear();
      filter.reset();
      setPreview(null);
      setFailure(null);
      setDone(false);
      previewer.reset();
      importer.forget();
    },
  };
}
