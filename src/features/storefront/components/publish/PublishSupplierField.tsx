// PublishSupplierField: "A supplier's services" of the Publish tab's start: a menu of the suppliers by name. A company has a
// handful of suppliers, so the menu holds them all. The services published are the live ones linked to a service of the supplier.
import { SelectField } from '@/components/ui';
import { useSupplierChoices } from '../../hooks/useSupplierChoices';

export interface PublishSupplierFieldProps {
  /** The chosen supplier's id as text, or '' while none is. */
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

/** The suppliers menu; a failed read says so under the menu. */
export function PublishSupplierField({ value, onChange, error }: PublishSupplierFieldProps) {
  const suppliers = useSupplierChoices(true);
  const options = [
    { value: '', label: suppliers.isLoading ? 'Loading…' : 'Choose a supplier' },
    ...(suppliers.data ?? []).map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
  ];
  return (
    <div className="space-y-1.5">
      <SelectField
        label="Supplier"
        selectWrapClassName="w-full"
        options={options}
        value={value}
        error={error}
        onChange={(event) => onChange(event.target.value)}
      />
      {suppliers.isError && (
        <p className="text-xs text-crit-fg" role="status">
          Could not load the suppliers.{' '}
          <button type="button" className="link" onClick={() => void suppliers.refetch()}>
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
