// DeleteRanksDialog: "Delete N ranks?" with the names of the ranks it will delete and, when some ticked ranks cannot go, which and why. Ports the
// delete-group dialog of the merchants page. The offer is the one made when the question was asked, so ticks cleared meanwhile cannot change it.
import { ConfirmDialog } from '@/components/ui';
import { deleteTitle, type DeleteOffer } from './rankList';

export interface DeleteRanksDialogProps {
  offer: DeleteOffer;
  onClose: () => void;
  /** Deletes the ranks of the offer. The dialog stays open until it settles. */
  onConfirm: () => Promise<void>;
}

/** Asks before deleting; the server still refuses a rank that has accounts, and the summary shows its words. */
export function DeleteRanksDialog({ offer, onClose, onConfirm }: DeleteRanksDialogProps) {
  const many = offer.targets.length !== 1;
  return (
    <ConfirmDialog
      open
      title={deleteTitle(offer.targets.length)}
      body={
        <>
          <p>
            {many ? 'These ranks are' : 'This rank is'} removed for good. Only a rank with no accounts can be
            deleted, so nobody loses their prices.
          </p>
          <ul className="mt-2 list-disc ps-5">
            {offer.targets.map((rank) => (
              <li key={rank.id}>{rank.name}</li>
            ))}
          </ul>
          {offer.skipped.length > 0 && (
            <>
              <p className="mt-2">Left as they are:</p>
              <ul className="mt-1 list-disc ps-5">
                {offer.skipped.map(({ rank, reason }) => (
                  <li key={rank.id}>
                    {rank.name}: {reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      }
      confirm={many ? 'Delete ranks' : 'Delete rank'}
      kind="danger"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
