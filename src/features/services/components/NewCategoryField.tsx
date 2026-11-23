// NewCategoryField: the "New category…" step under the category menu of the service form. It asks for a name, makes the category
// with the service's type, hands it back to be selected, and shows the server's words if it refuses. Console only: no new route.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Icon, TextField } from '@/components/ui';
import { useCreateCategory } from '../hooks/useCategoryMutations';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { newCategoryBody, refusalText } from '../lib/newCategory';
import type { ServiceCategory, ServiceType } from '../types';

export interface NewCategoryFieldProps {
  /** The type chosen in the service form: the new category gets it. */
  type: ServiceType;
  /** The categories the menu holds now, so the new one is put last. */
  categories: readonly ServiceCategory[];
  /** Called with the category the server made, so the form can choose it. */
  onCreated: (category: ServiceCategory) => void;
}

/**
 * A button that opens a small inline step (a name box with Create and Cancel). Enter creates and Escape closes the step; neither
 * reaches the form around it. The button needs `catalog:create`, the permission of the Categories tab's "New category".
 */
export function NewCategoryField({ type, categories, onCreated }: NewCategoryFieldProps) {
  const grants = useServiceGrants();
  const create = useCreateCategory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // The name box takes focus when the step opens.
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setProblem(null);
    setName('');
    trigger.current?.focus();
  }

  async function make() {
    if (create.isPending) return;
    if (name.trim() === '') {
      setProblem('Enter a name for the category.');
      input.current?.focus();
      return;
    }
    setProblem(null);
    try {
      const category = await create.mutateAsync(newCategoryBody(name, type, categories));
      onCreated(category);
      close();
    } catch (error) {
      setProblem(refusalText(error));
      input.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter would submit the service form around this step, Escape would close its dialog or panel: both are for the step.
    if (event.key === 'Enter') {
      event.preventDefault();
      void make();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  return (
    <div className="mt-1.5">
      <Button
        ref={trigger}
        size="sm"
        variant="ghost"
        aria-expanded={open}
        {...grants.needs('catalog:create')}
        onClick={() => (open ? input.current?.focus() : setOpen(true))}
      >
        <Icon name="plus" className="ic-sm" />
        New category…
      </Button>
      {open && (
        <div role="group" aria-label="New category" className="mt-2 space-y-2 rounded-md bg-sunken p-2.5">
          <TextField
            ref={input}
            label="Category name"
            autoComplete="off"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onKeyDown}
            hint="It is shown to every merchant group. Change that on the Categories tab."
            error={problem ?? undefined}
          />
          <div className="flex gap-2">
            <Button size="sm" loading={create.isPending} onClick={() => void make()}>
              Create category
            </Button>
            <Button size="sm" variant="ghost" disabled={create.isPending} onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
