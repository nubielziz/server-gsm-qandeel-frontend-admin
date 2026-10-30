// CommissionsHeader: the page title and the sentence under it. Ports the `head` of pageCommissions in 46-p-commissions.js. The number
// comes from the server (the ready count); the demo's page had no header actions.
import { PageHeader } from '@/components/ui';
import { num } from '@/lib/format';

/** What the sub line says: how many accruals wait for approval, in the demo's words. */
function readySentence(ready: number | undefined) {
  if (ready === undefined) return undefined;
  if (ready === 0) return 'Nothing is waiting. Approved commissions are already in the agents’ wallets.';
  return (
    <>
      <span className="font-medium text-warn-fg">
        {num(ready)} {ready === 1 ? 'accrual is' : 'accruals are'} ready to approve.
      </span>{' '}
      Approving pays the agent into their wallet and posts it to the ledger.
    </>
  );
}

/** The title and the ready sentence. */
export function CommissionsHeader({ ready }: { ready: number | undefined }) {
  return <PageHeader title="Commissions" sub={readySentence(ready)} />;
}
