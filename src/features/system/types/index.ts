// Types for the health route. The body is an assumed contract: any 2xx already means "reachable".

export type HealthState = 'ok' | 'degraded' | 'down';

/** Answer of `GET /health` (assumed contract): overall state and, optionally, one state per dependency. */
export type Health = {
  status: HealthState;
  checks?: Record<string, 'ok' | 'down'>;
};
