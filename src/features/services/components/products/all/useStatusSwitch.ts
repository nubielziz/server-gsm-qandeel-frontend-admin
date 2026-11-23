// The Status square of a row: switches one service on or off (`PATCH /admin/services/:id`), with the toast and the refresh of the
// status mutation. `isBusy(id)` says that row is saving (its square waits); a second press on a busy row does nothing, and other rows
// stay free, so two rows can be saved at the same time.
import { useCallback, useRef, useState } from 'react';
import type { Id } from '@/lib/api';
import { useSetServiceStatus } from '../../../hooks/useServiceMutations';
import type { Service } from '../../../types';

/** `toggle(service)` sends the opposite status of the one the row shows; the server's refusal is shown by the mutation's error toast. */
export function useStatusSwitch() {
  const { mutateAsync } = useSetServiceStatus();
  // The ref answers a double press at once; the state draws the busy rows.
  const working = useRef(new Set<Id>());
  const [busy, setBusy] = useState<ReadonlySet<Id>>(() => new Set());

  const mark = useCallback((id: Id, on: boolean) => {
    if (on) working.current.add(id);
    else working.current.delete(id);
    setBusy(new Set(working.current));
  }, []);

  const toggle = useCallback(
    (service: Service) => {
      if (working.current.has(service.id)) return;
      mark(service.id, true);
      // `mutateAsync` answers for its own call (the callbacks of `mutate` fire only for the latest call), so each row frees itself.
      // A refusal is already shown by the mutation's error toast.
      mutateAsync({ service, status: service.status === 'active' ? 'disabled' : 'active' })
        .catch(() => undefined)
        .finally(() => mark(service.id, false));
    },
    [mark, mutateAsync],
  );

  const isBusy = useCallback((id: Id) => busy.has(id), [busy]);
  return { toggle, isBusy };
}
