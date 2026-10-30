// Query keys more than one feature reads or makes stale. Keys owned by one feature stay in that feature.

/**
 * `GET /admin/dashboard`: the dashboard page and the sidebar counts read it. An action that changes a count (an order
 * completed, a deposit approved, a ticket answered) invalidates this key, so the counts update at once instead of at
 * the next minute's refresh.
 */
export const DASHBOARD_KEY = ['api', 'dashboard'] as const;
