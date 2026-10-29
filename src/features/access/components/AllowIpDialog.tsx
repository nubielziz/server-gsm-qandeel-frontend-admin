// AllowIpDialog: "Allow an address" (the demo's `allowDialog`, `ip-allow-add` and `ip-allow-mine` actions): an address or
// range that may open the admin console, with a label and an optional end time. Everyone still needs a password and 2FA.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useCreateIpRule } from '../hooks/useIpRuleMutations';
import { readIpRuleInput } from '../lib/ipGuards';
import { ALLOW_DURATIONS, expiresAtFor } from '../lib/ipRules';

type Values = { ip: string; label: string; hours: string };

export interface AllowIpDialogProps {
  /** An address to start from ("Add my IP" fills in the caller's own). */
  prefill?: string;
  onClose: () => void;
}

/**
 * The form for a new allowed address. The address is checked in the browser first (shape, width), so
 * obvious mistakes never reach the server.
 */
export function AllowIpDialog({ prefill = '', onClose }: AllowIpDialogProps) {
  const { myIp } = useAccessGrants();
  const create = useCreateIpRule();
  const form = useForm<Values>({ defaultValues: { ip: prefill, label: '', hours: '0' } });
  const {
    register,
    setError,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const input = readIpRuleInput({ raw: values.ip, kind: 'allow', scope: 'admin', myIp });
      if ('error' in input) {
        setError('ip', { type: 'validate', message: input.error }, { shouldFocus: true });
        // The message is under the address field; keep the dialog open.
        return false;
      }
      const hours = Number(values.hours);
      await create.mutateAsync({
        body: {
          kind: 'allow',
          scope: 'admin',
          cidr: input.cidr,
          label: values.label.trim(),
          expiresAt: expiresAtFor(hours),
        },
        hours,
      });
    },
    { fields: ['ip', 'label', 'hours'], aliases: { cidr: 'ip' } },
  );

  return (
    <FormDialog
      open
      title="Allow an address"
      sub="It can open the admin console. Everyone still needs a password and 2FA."
      confirm="Allow address"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="IP address or range"
          className="mono"
          autoComplete="off"
          spellCheck={false}
          placeholder="203.0.113.24 or 203.0.113.0/24"
          hint="Home connections change address now and then. Ask your provider for a fixed one, or allow a short range."
          error={errors.ip}
          {...register('ip', { required: 'Enter an IP address or a range.' })}
        />
        <TextField
          label="Label"
          maxLength={60}
          autoComplete="off"
          placeholder="Office, Amman"
          hint="So the next person knows whose it is."
          {...register('label')}
        />
        <SelectField
          label="For how long"
          selectWrapClassName="w-full"
          options={ALLOW_DURATIONS}
          hint="Pick a short time for someone who is travelling."
          {...register('hours')}
        />
      </div>
    </FormDialog>
  );
}
