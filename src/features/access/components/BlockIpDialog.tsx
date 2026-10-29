// BlockIpDialog: "Block an IP" (the demo's `blockIpDialog` and `ip-block` action): an address or range, who it applies to,
// a reason and for how long. Public: the customers page opens it with a customer's last address (scope `store`).
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useCreateIpRule } from '../hooks/useIpRuleMutations';
import { readIpRuleInput } from '../lib/ipGuards';
import { BLOCK_SCOPE_OPTS, expiresAtFor, IP_DURATIONS } from '../lib/ipRules';
import type { IpScope } from '../types';

type Values = { ip: string; scope: IpScope; reason: string; hours: string };

export interface BlockIpDialogProps {
  /** An address to start from (the last address of the admin or customer being looked at). */
  ip?: string;
  /** Who the block applies to at first; default the storefront. */
  scope?: IpScope;
  /** The person whose address this is: the dialog says only the address is blocked, not the account. */
  who?: string;
  onClose: () => void;
}

/**
 * The form for a new block. Public: the customers page opens it with the last address of a customer. A
 * range that includes the caller's own address is refused here for the console.
 */
export function BlockIpDialog({ ip = '', scope = 'store', who = '', onClose }: BlockIpDialogProps) {
  const { myIp } = useAccessGrants();
  const create = useCreateIpRule();
  const form = useForm<Values>({
    // A block for someone's own address starts as 7 days, a hand-typed one as "until I remove it" (the demo's defaults).
    defaultValues: { ip, scope, reason: '', hours: who ? '168' : '0' },
  });
  const {
    register,
    setError,
    setFocus,
    formState: { errors },
  } = form;

  // With the address filled in, the reason is the next thing to type (the dialog focuses the first field on its own).
  useEffect(() => {
    if (ip) setFocus('reason');
  }, [ip, setFocus]);

  const submit = dialogSubmit(
    form,
    async (values) => {
      const input = readIpRuleInput({ raw: values.ip, kind: 'block', scope: values.scope, myIp });
      if ('error' in input) {
        setError('ip', { type: 'validate', message: input.error }, { shouldFocus: true });
        // The message is under the address field; keep the dialog open.
        return false;
      }
      const hours = Number(values.hours);
      await create.mutateAsync({
        body: {
          kind: 'block',
          scope: values.scope,
          cidr: input.cidr,
          reason: values.reason.trim(),
          expiresAt: expiresAtFor(hours),
        },
        hours,
      });
    },
    { fields: ['ip', 'scope', 'reason', 'hours'], aliases: { cidr: 'ip' } },
  );

  return (
    <FormDialog
      open
      title="Block an IP"
      sub={
        who
          ? `Last used by ${who}. Only this address is blocked, the account is not touched.`
          : 'Requests from it get a plain “Access denied”.'
      }
      confirm="Block IP"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="IP address or range"
          className="mono"
          autoComplete="off"
          spellCheck={false}
          placeholder="198.51.100.20 or 198.51.100.0/24"
          hint="Ranges of /16 or narrower. Be careful: shared networks hide many people behind one address."
          error={errors.ip}
          {...register('ip', { required: 'Enter an IP address or a range.' })}
        />
        <SelectField
          label="Who it applies to"
          selectWrapClassName="w-full"
          options={BLOCK_SCOPE_OPTS}
          {...register('scope')}
        />
        <TextField
          label="Reason"
          maxLength={120}
          autoComplete="off"
          placeholder="Card testing, login attempts…"
          hint="So the next person knows why."
          error={errors.reason}
          {...register('reason', {
            validate: (value) => value.trim() !== '' || 'Add a short reason so the next person knows why.',
          })}
        />
        <SelectField
          label="Block for"
          selectWrapClassName="w-full"
          options={IP_DURATIONS}
          hint="A temporary block lifts itself."
          {...register('hours')}
        />
      </div>
    </FormDialog>
  );
}
