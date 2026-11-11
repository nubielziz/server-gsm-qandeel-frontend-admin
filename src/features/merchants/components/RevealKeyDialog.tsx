// RevealKeyDialog: shows a new API key once, with a copy button. The server keeps only a keyed hash of it, so this dialog is the only
// chance to pass it on; the key lives in this dialog's props and is gone when it closes.
import { Button, CopyButton, Modal } from '@/components/ui';

export interface RevealKeyDialogProps {
  name: string;
  secret: string;
  onClose: () => void;
}

export function RevealKeyDialog({ name, secret, onClose }: RevealKeyDialogProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`API key ${name}`}
      sub="Shown once. It cannot be read again after you close this."
      footer={
        <Button variant="primary" data-autofocus="" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-line bg-sunken p-3">
          <span className="mono min-w-0 flex-1 select-all break-all text-sm">{secret}</span>
          <CopyButton value={secret} label="API key" />
        </div>
        <p className="text-sm text-ink2">
          This key acts as the merchant. Send it over a private channel. It cannot be shown again.
        </p>
      </div>
    </Modal>
  );
}
