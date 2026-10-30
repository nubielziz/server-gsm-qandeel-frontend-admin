// The two ways a customer gets a password, as the radio options of the add-customer, create-account and password dialogs.
// Ports `pwChooser` of 48-p-customers.js; the server makes a temporary password and shows it once (MISMATCHES M12), so there
// is no field to type one in and no Generate button.
import type { RadioOption } from '@/components/ui';

export const PASSWORD_MODES: RadioOption[] = [
  {
    value: 'reset_link',
    label: 'Email a link to choose it',
    description:
      'They pick the password and you never see it. The link works for 1 hour. This is the safer choice.',
  },
  {
    value: 'temporary_password',
    label: 'Set a temporary password now',
    description:
      'We make one up and show it to you once. They must change it the first time they sign in. Send it to them over a private channel.',
  },
];
