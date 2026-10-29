// RevealPasswordDialog: shows a temporary password once, with a copy button. The server makes it up and never lets
// anyone read it again, so this dialog is the only chance to pass it on (the demo let the admin type it instead).
import { Button, CopyButton, Modal } from '@/components/ui';

export interface RevealPasswordDialogProps {
  name: string;
  password: string;
  onClose: () => void;
}

export function RevealPasswordDialog({ name, password, onClose }: RevealPasswordDialogProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`Temporary password for ${name}`}
      sub="Shown once. It cannot be read again after you close this."
      footer={
        <Button variant="primary" data-autofocus="" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-line bg-sunken p-3">
          <span className="mono min-w-0 flex-1 select-all break-all text-base">{password}</span>
          <CopyButton value={password} label="temporary password" />
        </div>
        <p className="text-sm text-ink2">
          Copy it now and send it to {name} over a private channel. They must change it the first time they
          sign in.
        </p>
      </div>
    </Modal>
  );
}
