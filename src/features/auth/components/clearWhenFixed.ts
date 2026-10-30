// clearWhenFixed: lets a sign-in field drop its error the moment its value is fixed, while new errors still wait
// for blur or submit (the forms re-validate on blur, never on each keystroke).
import type { UseFormRegisterReturn } from 'react-hook-form';

/**
 * Wraps a react-hook-form registration so a change that fixes the value clears the field's error at once. Without it
 * the fix would only be noticed on blur: pressing the submit button blurs the field, its message vanishes, the button
 * moves up under the pointer and the click is lost.
 */
export function clearWhenFixed<Name extends string>(
  registration: UseFormRegisterReturn<Name>,
  isFixed: (value: string) => boolean,
  clear: () => void,
): UseFormRegisterReturn<Name> {
  return {
    ...registration,
    onChange: async (event) => {
      const result = await registration.onChange(event);
      if (isFixed(String((event.target as HTMLInputElement).value))) clear();
      return result;
    },
  };
}
