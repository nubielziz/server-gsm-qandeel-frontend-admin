// The words and the rule of the two merchant switches of a service (User Can Cancel Order, Send For Verification) and of the verification
// window, shared by the +Add Service form and the Overview part so the two screens say and check the same thing.

/** The longest verification window the server accepts, in hours (30 days). */
export const MAX_VERIFY_WINDOW_H = 720;

/** What "User Can Cancel Order" does. A website order waits 2 minutes before it is sent, which is the time a merchant has to cancel it. */
export const CANCEL_HINT =
  'A merchant may cancel an order that was not sent yet. Website orders of this service wait 2 minutes before they are sent, so there is time to cancel.';

/** What "Send For Verification" does. */
export const VERIFY_HINT =
  "A merchant may ask once for a check of a completed order's result, inside the window below. The request shows in Orders, under Verification.";

/** What the verification window is. With 0 the button never appears on the website, so the window is 1 hour or more. */
export const WINDOW_HINT = 'How long after an order completes a merchant may ask for its verification.';

/**
 * The message under the verification window, or true when it is fine or the window does not apply (verification is off). With verification
 * on the window is a whole number of hours, 1 to 720: a window of 0 would leave the button off the website, so it is refused (a stored 0 shows
 * as it is and is refused on save).
 */
export function windowProblem(values: { verify: boolean; verifyWindowH: string }): string | true {
  if (!values.verify) return true;
  const text = values.verifyWindowH.trim();
  const hours = /^\d+$/.test(text) ? Number(text) : Number.NaN;
  return hours >= 1 && hours <= MAX_VERIFY_WINDOW_H ? true : `Enter the hours, 1 to ${MAX_VERIFY_WINDOW_H}.`;
}
