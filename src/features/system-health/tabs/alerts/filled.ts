// One form check shared by the dialogs of the Alerts & incidents tab: a text field must hold something.

/**
 * A react-hook-form `validate` rule for a text field that must not be empty or only spaces; `message` shows under the field
 * when it is. It only asks that the staff member wrote something: the server's own limits (a minimum or maximum length, a
 * known key) come back from the server under the same field.
 */
export const filled = (message: string) => (value: string) => value.trim().length > 0 || message;
