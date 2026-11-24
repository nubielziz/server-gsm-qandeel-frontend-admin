// What a refused reopen says. A reopen of a completed order moves its revenue back onto the buyer's hold, which only a merchant
// wallet has. When the account's rank changed after the sale and its live wallet is the store balance now, the server refuses
// with 409 `RANK_CHANGED` and the one way out is a refund, which always credits the wallet the account has today.

/** The code of that refusal. */
export const RANK_CHANGED_CODE = 'RANK_CHANGED';

/** The sentence the Reopen dialog shows for it, with the way out. */
export const RANK_CHANGED_TEXT =
  'The rank of this account changed after the sale, so its money is in the other kind of wallet and the order cannot go back on hold. Refund the order instead: the refund goes to the wallet the account has now.';
