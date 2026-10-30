// DeleteServiceDialog: "Delete <service>?" with a review step. The server decides whether the service can go (it refuses one it
// still needs, for example a service with orders); the dialog shows its message.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteService } from '../hooks/useServiceMutations';
import type { Service } from '../types';

export interface DeleteServiceDialogProps {
  service: Service;
  onClose: () => void;
  /** Called after the service was deleted, so the page can untick it. */
  onDeleted?: (service: Service) => void;
}

/** The review step before a service is deleted. */
export function DeleteServiceDialog({ service, onClose, onDeleted }: DeleteServiceDialogProps) {
  const remove = useDeleteService();
  return (
    <ConfirmDialog
      open
      title={`Delete ${service.name}?`}
      body={
        <p>
          The service and its prices are removed from the catalog. To only stop new orders and keep the
          history, turn off its Enabled switch instead.
        </p>
      }
      confirm="Delete service"
      kind="danger"
      onClose={onClose}
      onConfirm={async () => {
        await remove.mutateAsync(service);
        onDeleted?.(service);
      }}
    />
  );
}
