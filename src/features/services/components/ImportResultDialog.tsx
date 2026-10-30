// ImportResultDialog: what the server made of an import: how many codes it added, how many it already had (duplicates) and how many
// it could not read (rejected). The counts are the server's; nothing is checked in the browser.
import { Button, KeyValue, Modal } from '@/components/ui';
import { num } from '@/lib/format';
import type { ImportCodesResult } from '../types';

export interface ImportResultDialogProps {
  result: ImportCodesResult;
  serviceName: string;
  onClose: () => void;
}

/** The server's counts after an import. */
export function ImportResultDialog({ result, serviceName, onClose }: ImportResultDialogProps) {
  return (
    <Modal
      open
      title="Import finished"
      sub={serviceName}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <KeyValue
        className="!grid-cols-[170px_1fr]"
        rows={[
          [
            'Imported',
            <span key="imported" className="font-medium tabular-nums">
              {num(result.imported)}
            </span>,
          ],
          [
            'Duplicates, skipped',
            <span key="duplicates" className="tabular-nums">
              {num(result.duplicates)}
            </span>,
          ],
          [
            'Rejected',
            <span key="rejected" className="tabular-nums">
              {num(result.rejected)}
            </span>,
          ],
          result.batchRef
            ? [
                'Batch',
                <span key="batch" className="mono">
                  {result.batchRef}
                </span>,
              ]
            : null,
        ]}
      />
      {(result.duplicates > 0 || result.rejected > 0) && (
        <p className="mt-3 text-sm text-ink2">
          Duplicates are codes the stock already holds. Rejected lines could not be read as codes.
        </p>
      )}
    </Modal>
  );
}
