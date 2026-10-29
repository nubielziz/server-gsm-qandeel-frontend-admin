// AddMyIpDialog: "Add your address first" (the demo's `ac-restrict` flow when your own address is not on the allowed list):
// turning the restriction on would lock you out, so this allows your address and then turns it on.
import { ConfirmDialog } from '@/components/ui';
import { useAllowMyIpAndRestrict } from '../hooks/useRestriction';

export interface AddMyIpDialogProps {
  /** The caller's address and name; the new rule is labelled "Me, <name>". */
  myIp: string;
  name: string;
  /** Why the restriction cannot go on yet (the client hint). */
  reason: string;
  onClose: () => void;
}

/**
 * Allows the caller's own address and turns the restriction on in one step, so the person is not left to
 * work out why the switch would not go on.
 */
export function AddMyIpDialog({ myIp, name, reason, onClose }: AddMyIpDialogProps) {
  const run = useAllowMyIpAndRestrict();
  return (
    <ConfirmDialog
      open
      title="Add your address first"
      sub="Otherwise you would lock yourself out."
      body={<p>{reason}</p>}
      confirm="Add my IP and turn on"
      onClose={onClose}
      onConfirm={() => run.mutateAsync({ cidr: myIp, label: `Me, ${name}` }).then(() => undefined)}
    />
  );
}
