// CampaignComposer: the wide drawer where a campaign is written: basics, audience, the live count and the message. It saves a draft (`POST`, or `PATCH`
// for an edit) and never sends: sending is done from the campaign's page. It opens empty, or filled from a campaign (Edit keeps it, Duplicate saves a new
// draft). The server's field errors show under their fields.
import { useState } from 'react';
import { Button, Drawer } from '@/components/ui';
import { useBroadcastGrants } from '../hooks/useBroadcastGrants';
import { useSaveCampaign } from '../hooks/useCampaignMutations';
import { placeErrors } from '../lib/serverErrors';
import {
  audienceProblems,
  campaignToForm,
  composerProblems,
  emptyForm,
  formToInput,
  type ComposerForm,
} from '../lib/spec';
import type { CampaignDetail } from '../types';
import { AudienceBuilder } from './AudienceBuilder';
import { AudienceCount } from './AudienceCount';
import { ComposerBasics } from './ComposerBasics';
import { MessageFields } from './MessageFields';

export interface CampaignComposerProps {
  open: boolean;
  onClose: () => void;
  /** The campaign to edit, or to copy when `duplicate` is set. Leave out for a new campaign. */
  campaign?: CampaignDetail;
  duplicate?: boolean;
  /** Gets the saved campaign (the page then opens it). */
  onSaved: (campaign: CampaignDetail) => void;
}

/** Mounted only while open, so every opening starts from the campaign (or empty) with no leftover errors. */
export function CampaignComposer({ open, ...rest }: CampaignComposerProps) {
  return open ? <ComposerSession {...rest} /> : null;
}

function ComposerSession({
  onClose,
  campaign,
  duplicate = false,
  onSaved,
}: Omit<CampaignComposerProps, 'open'>) {
  const grants = useBroadcastGrants();
  const [form, setForm] = useState<ComposerForm>(() =>
    campaign ? campaignToForm(campaign, { duplicate }) : emptyForm(),
  );
  const [attempted, setAttempted] = useState(false);
  const editing = campaign !== undefined && !duplicate;
  const save = useSaveCampaign((saved) => {
    onSaved(saved);
    onClose();
  });
  const placed = placeErrors(save.error);
  // The hints about the audience's own fields (a country that is not a code) show at once; every other hint shows after the first try. The server's
  // messages are kept until the next change.
  const live = Object.fromEntries(
    Object.entries(audienceProblems(form)).filter(([field]) => field.startsWith('audience.')),
  );
  const errors = { ...placed.fields, ...live, ...(attempted ? composerProblems(form) : {}) };

  const change = (patch: Partial<ComposerForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    save.reset();
  };

  function submit() {
    setAttempted(true);
    if (Object.keys(composerProblems(form)).length > 0) return;
    save.mutate({ id: editing ? campaign.id : undefined, input: formToInput(form) });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? 'Edit campaign' : duplicate ? 'Duplicate campaign' : 'New campaign'}
      sub="Saved as a draft. You send it from the campaign's page."
      closeLabel="Close the composer"
      footer={
        <>
          <span className="flex-1" />
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={save.isPending}
            disabled={!grants.canSend}
            title={grants.needs('broadcasts:send').title}
            onClick={submit}
          >
            {editing ? 'Save changes' : 'Save draft'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {placed.rest.length > 0 && (
          <p className="rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">
            {placed.rest.join(' ')}
          </p>
        )}
        <ComposerBasics form={form} onChange={change} errors={errors} />
        <AudienceBuilder
          audience={form.audience}
          onChange={(audience) => change({ audience })}
          grants={grants}
          errors={errors}
        />
        <AudienceCount form={form} />
        <MessageFields form={form} onChange={change} errors={errors} />
      </div>
    </Drawer>
  );
}
