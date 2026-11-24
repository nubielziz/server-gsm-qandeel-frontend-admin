// PrivacyActions: the buttons of the Privacy and risk part: Export data…, Anonymize… and Block… or Unblock…. Who is offered what is the one
// table of the action rules (frame/actionRules): a button is drawn only when the rule shows it, and it is disabled, with the reason as its
// title, when a permission or a state is missing. Each opens its dialog through the host. An anonymized account says what was removed.
import { Button, FormRow, Icon } from '@/components/ui';
import { actionOffer } from '../frame/actionRules';
import type { AccountPartProps } from '../types';

/** The buttons, in the order Export, Anonymize, Block or Unblock. */
export function PrivacyActions({
  account,
  grants,
  onAction,
}: Pick<AccountPartProps, 'account' | 'grants' | 'onAction'>) {
  const exportOffer = actionOffer('export', account, grants);
  const anonymizeOffer = actionOffer('anonymize', account, grants);
  const blockOffer = actionOffer('block', account, grants);
  const unblockOffer = actionOffer('unblock', account, grants);
  const anonymized = account.status === 'anonymized';
  return (
    <FormRow label={null}>
      {anonymized && (
        <p className="mb-3 rounded-md bg-sunken p-2.5 text-sm text-ink2">
          Name, email and IMEIs have been removed. Order and payment records stay for accounting.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {exportOffer.show && (
          <Button
            disabled={exportOffer.disabled}
            title={exportOffer.title}
            onClick={() => onAction('export', [account])}
          >
            <Icon name="download" className="ic-sm" />
            Export data…
          </Button>
        )}
        {anonymizeOffer.show && (
          <Button
            variant="danger"
            disabled={anonymizeOffer.disabled}
            title={anonymizeOffer.title}
            onClick={() => onAction('anonymize', [account])}
          >
            Anonymize…
          </Button>
        )}
        {blockOffer.show && (
          <Button
            variant="danger"
            disabled={blockOffer.disabled}
            title={blockOffer.title}
            onClick={() => onAction('block', [account])}
          >
            <Icon name="ban" className="ic-sm" />
            Block…
          </Button>
        )}
        {unblockOffer.show && (
          <Button
            disabled={unblockOffer.disabled}
            title={unblockOffer.title}
            onClick={() => onAction('unblock', [account])}
          >
            Unblock…
          </Button>
        )}
      </div>
    </FormRow>
  );
}
