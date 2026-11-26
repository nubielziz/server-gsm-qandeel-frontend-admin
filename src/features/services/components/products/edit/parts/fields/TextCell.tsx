// TextCell: one text input of a row of the Custom Fields table, with its error line under it in the cell. The input is registered by the table
// (under `fields.<row>.<name>`), so the server's field messages find it; its accessible name is "<label> of field <n>", numbered from 1.
import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { PermissionLock } from '@/components/ui';

export interface TextCellProps {
  /** The row's number, from 1. */
  n: number;
  /** What the input is, such as "Name": the accessible name is "<label> of field <n>". */
  label: string;
  field: UseFormRegisterReturn;
  error?: string;
  lock: PermissionLock;
  placeholder?: string;
}

/** The input and, when the row has a problem with it, the line that says so. */
export function TextCell({ n, label, field, error, lock, placeholder }: TextCellProps) {
  const id = useId();
  return (
    <>
      <input
        id={id}
        className="input-sm w-full min-w-24 aria-[invalid=true]:border-crit-dot"
        aria-label={`${label} of field ${n}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        disabled={lock.disabled}
        title={lock.title}
        {...field}
      />
      {error && (
        <span id={`${id}-error`} className="cell-sub text-crit-fg">
          {error}
        </span>
      )}
    </>
  );
}
