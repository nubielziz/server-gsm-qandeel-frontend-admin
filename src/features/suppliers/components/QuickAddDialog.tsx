// QuickAddDialog: "Quick add…": add a supplier's services by whole group, or all of them, in the background. Three steps in one
// dialog: pick the groups, review what will happen, then follow the run. The server builds the list and does the work; the
// console sends a scope and polls the run. Built in the demo's dialog style (the demo has no such screen).
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Modal, useRowSelection } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { useQuickAddRun, useServiceGroups, useStartQuickAdd } from '../hooks/useQuickAdd';
import { useSupplierGrants } from '../hooks/useSupplierGrants';
import {
  CONFIRM_ABOVE,
  isLive,
  pickedGroups,
  pickedTotals,
  quickAddBody,
  servicesText,
  tooManyGroups,
} from '../lib/quickAdd';
import { refusalText } from '../lib/quickAddFlow';
import { isNoRuleRefusal, publishLock, wantsPublishLine } from '../lib/quickAddPublish';
import type { QuickAddRun, QuickAddServiceStatus, Supplier } from '../types';
import { QuickAddFooter, type QuickAddStep } from './QuickAddFooter';
import { QuickAddGroups } from './QuickAddGroups';
import { QuickAddNoRule } from './QuickAddNoRule';
import { QuickAddProgress } from './QuickAddProgress';
import { QuickAddReview } from './QuickAddReview';

export interface QuickAddDialogProps {
  supplier: Pick<Supplier, 'id' | 'name'>;
  onClose: () => void;
}

const SUBS: Record<QuickAddStep, string | undefined> = {
  groups:
    "Add whole groups of this supplier's services at once. Only services that are not in the console yet are added.",
  review: 'Check what will happen. Nothing has changed yet.',
  progress: undefined,
};

/**
 * The three steps. The picks survive Back; a run already going when the dialog opens is shown at once (step 3), and so is a run that
 * ended after asking to publish, so its publishing line and "Prepare the shop preview" are not lost when the dialog is opened again.
 */
export function QuickAddDialog({ supplier, onClose }: QuickAddDialogProps) {
  const [step, setStep] = useState<QuickAddStep>('groups');
  const [tracked, setTracked] = useState<QuickAddRun | null>(null);
  const [serviceStatus, setServiceStatus] = useState<QuickAddServiceStatus>('active');
  const [confirmed, setConfirmed] = useState(false);
  const [publish, setPublish] = useState(false);
  const [error, setError] = useState<ReactNode>(null);
  const selection = useRowSelection<string>();
  const grants = useSupplierGrants();
  const groups = useServiceGroups(supplier.id);
  const start = useStartQuickAdd(supplier.id);
  const { run, query } = useQuickAddRun(supplier, tracked);
  const decided = useRef(false);

  // Once, when the first fresh answer arrives: open on the progress of a run that is already going (queued or running) or that ended
  // with a publish line to show (the plan's 6.3: the dialog shows the publish run when it is opened again).
  useEffect(() => {
    if (decided.current || !groups.isFetchedAfterMount || !groups.data) return;
    decided.current = true;
    const latest = groups.data.latestRun;
    if (step === 'groups' && latest && (isLive(latest) || wantsPublishLine(latest))) {
      setTracked(latest);
      setStep('progress');
    }
  }, [groups.isFetchedAfterMount, groups.data, step]);

  const list = groups.data?.groups ?? [];
  // "Also put them on the shop" counts only while it can be used: switched off services and a role without `storefront:publish` lock it.
  const publishReason = publishLock(serviceStatus, grants.can('storefront:publish'));
  const publishing = publish && publishReason === undefined;
  const body = quickAddBody(list, selection.selected, serviceStatus, publishing);
  const picked = { ...pickedTotals(list, selection.selected), tooMany: tooManyGroups(body) };
  const needsConfirm = picked.services > CONFIRM_ABOVE;

  function backToGroups(clearPicks: boolean) {
    if (clearPicks) selection.clear();
    setTracked(null);
    setConfirmed(false);
    setError(null);
    setStep('groups');
    void groups.refetch();
  }

  // A refused start: another run is live (show it), nothing is left to add (say so, with fresh counts), or anything else.
  async function startFailed(failure: unknown) {
    if (isApiError(failure) && failure.code === 'JOB_ALREADY_RUNNING') {
      const latest = (await groups.refetch()).data?.latestRun;
      if (latest) {
        setTracked(latest);
        setStep('progress');
        return;
      }
    }
    if (isApiError(failure) && failure.status === 422) {
      void groups.refetch();
      setStep('groups');
    }
    // No active retail pricing rule: the server's words, with the way to make one.
    setError(
      isNoRuleRefusal(failure) ? <QuickAddNoRule message={refusalText(failure)} /> : refusalText(failure),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (start.isPending) return;
    setError(null);
    if (step === 'groups') {
      if (picked.groups === 0 || picked.tooMany) return;
      setConfirmed(false);
      setStep('review');
    } else if (step === 'review' && (!needsConfirm || confirmed)) {
      try {
        setTracked(await start.mutateAsync(body));
        setStep('progress');
      } catch (failure) {
        await startFailed(failure);
      }
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={`Quick add from ${supplier.name}`}
      sub={SUBS[step]}
      onClose={onClose}
      dismissible={!start.isPending}
      error={error}
      onSubmit={(event) => void submit(event)}
      footer={
        <QuickAddFooter
          step={step}
          run={run}
          canContinue={picked.groups > 0 && !picked.tooMany}
          addLabel={`Add ${servicesText(picked.services)}`}
          canAdd={!needsConfirm || confirmed}
          adding={start.isPending}
          onClose={onClose}
          onBack={() => {
            setError(null);
            setStep('groups');
          }}
          onMore={() => backToGroups(true)}
          onRestart={() => backToGroups(false)}
        />
      }
    >
      {step === 'groups' && (
        <QuickAddGroups
          groups={groups}
          selection={selection}
          picked={picked}
          serviceStatus={serviceStatus}
          onServiceStatus={setServiceStatus}
          publish={{ checked: publishing, lock: publishReason, onChange: setPublish }}
        />
      )}
      {step === 'review' && (
        <QuickAddReview
          supplierName={supplier.name}
          scope={body.scope}
          groups={pickedGroups(list, selection.selected)}
          services={picked.services}
          serviceStatus={serviceStatus}
          publish={publishing}
          confirmed={confirmed}
          onConfirmed={setConfirmed}
        />
      )}
      {step === 'progress' && <QuickAddProgress run={run} query={query} />}
    </Modal>
  );
}
