// GroupsFlowDialog: the whole-groups path of the Add services flow. It takes over after "Where from" and shows the other two steps in
// one dialog: the supplier's groups with what adding them does, then how to add them, the shop switch, Start, the run and its result.
import type { FormEvent } from 'react';
import { Modal, Steps } from '@/components/ui';
import { useQuickAddFlow } from '../../hooks/useQuickAddFlow';
import { stepOf, type FlowStage } from '../../lib/quickAddFlow';
import { QuickAddGroups } from '../QuickAddGroups';
import { QuickAddNoRule } from '../QuickAddNoRule';
import { QuickAddProgress } from '../QuickAddProgress';
import { GroupsFinish } from './groups/GroupsFinish';
import { GroupsFlowFooter } from './groups/GroupsFlowFooter';
import { GroupsReview } from './groups/GroupsReview';
import { StepHeading } from './StepHeading';
import { ADD_FLOW_STEPS, type AddFlowPathProps } from './types';

/** What each screen is called for a screen reader; focus lands on it when the screen changes (Next, Start, Back). */
const HEADINGS: Record<FlowStage, string> = {
  prices: 'Pick the groups to add',
  finish: 'Finish: how to add them',
  progress: 'Adding the services',
};

/**
 * The dialog of the path. A run of the supplier that is still going opens on its progress. Back from the first step goes to "Where
 * from"; the dialog cannot be closed while the start request runs. `onDone` is called once for each run that added services.
 */
export function GroupsFlowDialog({ supplier, onBack, onClose, onDone }: AddFlowPathProps) {
  const flow = useQuickAddFlow(supplier, onDone);
  const startLock = flow.grants.needs('catalog:create');
  const { failure } = flow;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flow.stage === 'prices') flow.next();
    else if (flow.stage === 'finish') void flow.begin();
  }

  return (
    <Modal
      open
      size="lg"
      title="Add services"
      sub={<Steps steps={ADD_FLOW_STEPS} current={stepOf(flow.stage)} />}
      onClose={onClose}
      dismissible={!flow.adding}
      backdropCloses={false}
      error={failure && (failure.noRule ? <QuickAddNoRule message={failure.text} /> : failure.text)}
      onSubmit={submit}
      footer={
        <GroupsFlowFooter
          stage={flow.stage}
          run={flow.run}
          canNext={flow.picked.groups > 0 && !flow.picked.tooMany}
          canStart={!flow.needsConfirm || flow.confirmed}
          adding={flow.adding}
          startLock={startLock}
          onBack={flow.stage === 'prices' ? onBack : flow.back}
          onClose={onClose}
          onMore={() => flow.again(true)}
          onRestart={() => flow.again(false)}
        />
      }
    >
      <StepHeading step={flow.stage}>{HEADINGS[flow.stage]}</StepHeading>
      {flow.stage === 'prices' && (
        <div className="space-y-4">
          <QuickAddGroups groups={flow.groups} selection={flow.selection} picked={flow.picked} />
          {flow.picked.groups > 0 && (
            <GroupsReview
              supplierName={supplier.name}
              scope={flow.scope}
              groups={flow.pickedGroupCount}
              services={flow.picked.services}
              rule={flow.rule}
            />
          )}
        </div>
      )}
      {flow.stage === 'finish' && (
        <GroupsFinish
          supplierName={supplier.name}
          scope={flow.scope}
          groups={flow.pickedGroupCount}
          services={flow.picked.services}
          serviceStatus={flow.serviceStatus}
          onServiceStatus={flow.onServiceStatus}
          shop={flow.shop}
          rule={flow.rule}
          needsConfirm={flow.needsConfirm}
          confirmed={flow.confirmed}
          onConfirmed={flow.onConfirmed}
        />
      )}
      {flow.stage === 'progress' && <QuickAddProgress run={flow.run} query={flow.query} />}
    </Modal>
  );
}
