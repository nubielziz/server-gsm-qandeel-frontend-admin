// The two attributes a control in a FormRow needs so a screen reader reads its hint and its error. FormRow gives the hint and the error the ids
// `<htmlFor>-hint` and `<htmlFor>-error` (the kit's convention); a control that is not a kit field (several controls share one row) points at them.

/** The class the kit's own fields use to draw a red border on a control marked invalid (a bare `<input>` in a row needs it too). */
export const INVALID_BORDER = 'aria-[invalid=true]:border-crit-dot';

/** `aria-invalid` and `aria-describedby` for the control whose row has `htmlFor={id}`; `hint` and `error` say which notes the row draws. */
export function fieldWiring(id: string, notes: { hint?: boolean; error?: boolean }) {
  const described = [notes.hint ? `${id}-hint` : '', notes.error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');
  return {
    'aria-invalid': notes.error ? true : undefined,
    'aria-describedby': described === '' ? undefined : described,
  };
}
