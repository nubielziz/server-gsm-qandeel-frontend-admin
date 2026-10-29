// IpTester: "Test an address" panel. Type an address, pick where the visitor comes in, and see what the server would do
// before any rule changes. Ports ipTester and its submit handler in 56-p-access.js; the demo decided in the browser,
// the console asks the server (`POST /admin/ip-rules/check`).
import { useState, type FormEvent } from 'react';
import { Badge, Button, errorText, SelectField, TextField } from '@/components/ui';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useCheckIp } from '../hooks/useIpCheck';
import { isIpError, parseIp } from '../lib/ip';
import { IP_SCOPE_TAG, TEST_SCOPE_OPTS } from '../lib/ipRules';
import { readVerdict, type Verdict } from '../lib/ipVerdict';
import type { IpScope } from '../types';

// The sentence after "<address> on <place>.", by the reason for the decision.
function Reason({ verdict }: { verdict: Verdict }) {
  const rule = verdict.rule;
  if (verdict.why === 'blocked' && rule) {
    return (
      <>
        Blocked by the rule for <span className="mono">{rule.cidr}</span> ({IP_SCOPE_TAG[rule.scope]}):{' '}
        {rule.reason}.
      </>
    );
  }
  if (verdict.why === 'not_listed') {
    return <>The admin console only opens for allowed addresses and this one is not on the list.</>;
  }
  if (verdict.why === 'allowed' && rule) {
    return (
      <>
        On the allowed list as <span className="mono">{rule.cidr}</span>
        {rule.label ? ` (${rule.label})` : ''}.
      </>
    );
  }
  return <>No block rule matches. The address can connect.</>;
}

/**
 * The address tester. A malformed address is caught in the browser; a good one is sent to the server,
 * which gives the decision.
 */
export function IpTester() {
  const { needs } = useAccessGrants();
  const lock = needs('access:read');
  const check = useCheckIp();
  const [ip, setIp] = useState('');
  const [scope, setScope] = useState<IpScope>('admin');
  // The shape problem found before asking the server.
  const [shapeError, setShapeError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseIp(ip);
    if (isIpError(parsed)) {
      check.reset();
      setShapeError(parsed.error);
      return;
    }
    setShapeError(undefined);
    check.mutate({ ip: parsed.text, scope });
  }

  const problem = shapeError ?? (check.isError ? errorText(check.error) : undefined);
  const verdict = check.data ? readVerdict(check.data) : undefined;
  const asked = check.variables;

  return (
    <section className="panel p-3.5" aria-label="Test an address">
      <h2 className="text-sm font-semibold">Test an address</h2>
      <p className="mt-0.5 text-sm text-ink2">See what would happen to a visitor before you change a rule.</p>
      <form className="mt-3 flex flex-wrap items-end gap-2" noValidate onSubmit={submit}>
        <TextField
          label="IP address"
          className="mono"
          wrapperClassName="min-w-[12rem] flex-1 sm:max-w-xs"
          name="ip"
          autoComplete="off"
          spellCheck={false}
          placeholder="198.51.100.231"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
        />
        <SelectField
          label="Where"
          name="scope"
          options={TEST_SCOPE_OPTS}
          value={scope}
          onChange={(event) => setScope(event.target.value as IpScope)}
        />
        <Button type="submit" loading={check.isPending} disabled={lock.disabled} title={lock.title}>
          Check
        </Button>
      </form>
      {(problem || verdict) && (
        <div className="mt-3 rounded-md border border-line bg-sunken p-3">
          {problem ? (
            <p className="text-sm text-crit-fg" role="alert">
              {problem}
            </p>
          ) : (
            verdict &&
            asked && (
              <div className="flex flex-wrap items-start gap-2.5 text-sm" role="status">
                {verdict.ok ? (
                  <Badge tone="good" icon="checkCircle">
                    Allowed
                  </Badge>
                ) : (
                  <Badge tone="crit" icon="ban">
                    Refused
                  </Badge>
                )}
                <p className="min-w-0 flex-1 text-ink2">
                  <span className="mono text-ink">{asked.ip}</span> on{' '}
                  {IP_SCOPE_TAG[asked.scope].toLowerCase()}. <Reason verdict={verdict} />
                </p>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
