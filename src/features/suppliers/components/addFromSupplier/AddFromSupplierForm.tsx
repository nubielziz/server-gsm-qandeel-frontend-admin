// AddFromSupplierForm: the form that adds services from a connected supplier, in place and with no dialog or steps: Supplier, Add (whole groups or
// single services), the picker, Service Listed In Group, Status, Put on the shop, and the pinned Add bar; the progress and the result show under
// the rows, above the bar. It is the ticked form of the Product / Services page's +Add Service view.
import type { ReactNode } from 'react';
import { Button, CheckboxField, FormRow, PinnedBar } from '@/components/ui';
import { num } from '@/lib/format';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { servicesText } from '../../lib/quickAdd';
import { runWords } from '../../lib/importPlan';
import { ListedRow, ShopRow, StatusRow } from './ChoiceRows';
import { GroupsPicker } from './GroupsPicker';
import { useAddFromSupplier } from './hooks/useAddFromSupplier';
import type { AddInitial } from './lib/addRules';
import { RunSection } from './RunSection';
import { ServicesPicker } from './ServicesPicker';
import { SupplierRows } from './SupplierRows';

/** What the form takes. */
export interface AddFromSupplierFormProps {
  /** The kind of service on the page's strip: only the groups and services of this kind are offered. */
  type: ServiceType;
  /** Where the address says to start: a supplier already chosen, and the way in. A supplier that cannot be used says why. */
  initial?: AddInitial;
  /**
   * Called once for each answer that added services, with the ids of the services the server named (a whole-groups run names none: it works
   * in the background and the server does not list what it made). The form keeps its result on screen: the host refreshes its lists and
   * does not need to leave the view.
   */
  onDone: (createdIds: Id[]) => void;
  /**
   * What sits above the rows, inside the view's frame (the heading and the "Add services from a supplier" checkbox), so the frame and its pinned
   * bar fit the window together. The form reports its own result above the bar; the host draws none of its own.
   */
  header?: ReactNode;
}

/** The form body. The wrapper mounts it again when the kind changes, so a pick never crosses kinds. */
function AddFromSupplierFormBody({ type, initial, onDone, header }: AddFromSupplierFormProps) {
  const add = useAddFromSupplier({ type, initial, onDone });
  const { supplier, way, singles, groups, block } = add;
  const sending = way === 'services' ? singles.importer.progressFor(singles.ids) : null;

  return (
    <form
      className="view-frame"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (block === undefined) void add.submit();
      }}
    >
      <div>
        {header}
        <SupplierRows add={add} />
        {supplier ? (
          way === 'groups' ? (
            <GroupsPicker add={add} />
          ) : (
            <ServicesPicker add={add} />
          )
        ) : (
          <FormRow label={null}>
            <p className="text-sm text-ink3">
              Pick a supplier to see the {way === 'groups' ? 'groups' : 'services'} it offers.
            </p>
          </FormRow>
        )}
        <ListedRow add={add} />
        <StatusRow add={add} />
        <ShopRow add={add} />
        {way === 'groups' && groups.needsConfirm && (
          <CheckboxField
            layout="row"
            label={`I checked the groups. Add ${servicesText(groups.picked.services)}.`}
            checked={groups.confirmed}
            onChange={(event) => groups.setConfirmed(event.target.checked)}
          />
        )}
        <RunSection add={add} />
      </div>
      <PinnedBar>
        <Button
          type="submit"
          variant="primary"
          loading={add.adding}
          disabled={block !== undefined}
          title={block}
        >
          {runWords('Add', 'Add', sending)}
        </Button>
        {block !== undefined && <span className="text-xs text-ink3">{block}</span>}
        {way === 'services' && singles.selection.selected.size > 0 && (
          <span className="text-xs text-ink3">{num(singles.selection.selected.size)} picked</span>
        )}
      </PinnedBar>
    </form>
  );
}

/**
 * The form that adds services from a supplier (the ticked form of +Add Service). Everything the server must decide it decides: the
 * groups it creates, the prices it suggests, the work it does in the background. Needs `catalog:create` (each control keeps its own lock).
 * @see decision 022, the add view of the Product / Services page
 */
export function AddFromSupplierForm(props: AddFromSupplierFormProps) {
  return <AddFromSupplierFormBody key={props.type} {...props} />;
}
