// TurnOffRestrictionDialog: "Open the admin console to any address?" (the review step of the demo's `ac-restrict` action
// when the restriction is on). A refusal from the server shows in the dialog.
import { ConfirmDialog } from '@/components/ui';
import { useSetRestriction } from '../hooks/useRestriction';

export function TurnOffRestrictionDialog({ onClose }: { onClose: () => void }) {
  const setRestriction = useSetRestriction();
  return (
    <ConfirmDialog
      open
      title="Open the admin console to any address?"
      body={
        <p>
          The sign-in page will open from everywhere. A password and 2FA are still needed. Block rules still
          apply.
        </p>
      }
      confirm="Turn off"
      kind="danger"
      onClose={onClose}
      onConfirm={() => setRestriction.mutateAsync(false).then(() => undefined)}
    />
  );
}
