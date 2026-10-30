// The permissions behind the Risk page's actions, as the map names them. The page itself needs `risk:read`, which the app
// checks. Hiding or disabling a control is a hint only: the server checks every request (ARCHITECTURE §3).

export const RISK_PERMISSION = {
  /** Approve or refund a held order (`POST /admin/risk/orders/:id/approve|refund`). */
  decide: 'risk:decide',
  /** Add to the blocklist: the CRUD row `risk:*` read as create (MISMATCHES M7). */
  addBlock: 'risk:create',
  /** Remove from the blocklist: the CRUD row `risk:*` read as delete (MISMATCHES M7). */
  removeBlock: 'risk:delete',
  /** Change the rules (`PUT /admin/risk/rules`): the action row says `risk:*`, the whole area. */
  rules: 'risk:*',
} as const;
