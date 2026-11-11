// The two ways a merchant gets a password, as the radio options of the password dialog. Ports the customers' `PASSWORD_MODES`
// with the merchant's words: the first option is "Email the invitation again" while the merchant has no password yet.
import type { RadioOption } from '@/components/ui';

/** The options of the dialog; `hasPassword` is false for a merchant staff invited who never chose one. */
export function passwordModes(hasPassword: boolean): RadioOption[] {
  return [
    hasPassword
      ? {
          value: 'reset_link',
          label: 'Email a link to choose it',
          description:
            'They pick the password and you never see it. The link works for 1 hour. This is the safer choice.',
        }
      : {
          value: 'reset_link',
          label: 'Email the invitation again',
          description:
            'The new invitation replaces the old one. They pick the password and you never see it. The link works for 1 hour.',
        },
    {
      value: 'temporary_password',
      label: 'Set a temporary password now',
      description:
        'We make one up and show it to you once. Send it to them over a private channel. The merchant must choose a new password at the next sign-in.',
    },
  ];
}
