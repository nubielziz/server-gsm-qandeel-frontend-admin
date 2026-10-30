// The class every sign-in form carries: the sizes and gaps of the sign-in screens, set on the form so the shared kit
// keeps its 32px console size everywhere else.

/**
 * 16px between fields, 8px between a label and its field, and 36px inputs and primary button (one step above the
 * console's 32px, for a first screen). `.btn-primary` is matched, not `.btn`, so small buttons inside a form (the copy
 * button of the setup key) keep their own size.
 */
export const AUTH_FORM_CLASS = 'space-y-4 [&_.btn-primary]:h-9 [&_.input]:h-9 [&_.label]:mb-2';
