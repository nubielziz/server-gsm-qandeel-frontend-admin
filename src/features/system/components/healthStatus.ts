// Turns the state of the health query into what the sidebar foot shows. Replaces the demo's "synthetic data" note.
import type { BadgeTone } from '@/components/ui';
import type { Health } from '../types';

export type HealthView = {
  tone: BadgeTone;
  /** The state in words, so it is never colour alone. */
  label: string;
  /** Which dependencies are down, when the API says so ("postgres down"). */
  detail?: string;
};

/**
 * `isError` wins over old data: if the last check failed the API is unreachable now, whatever the check before said.
 * A 2xx answer with a status other than `ok` means the API runs but a dependency does not, so it is "degraded"
 * (critical tone when the API itself calls the state `down`).
 */
export function describeHealth(state: { data: Health | undefined; isError: boolean }): HealthView {
  if (state.isError) return { tone: 'crit', label: 'API unreachable' };
  const { data } = state;
  if (!data) return { tone: 'neutral', label: 'Checking API…' };
  if (data.status === 'ok') return { tone: 'good', label: 'API healthy' };
  const failing = Object.entries(data.checks ?? {})
    .filter(([, result]) => result === 'down')
    .map(([name]) => `${name} down`);
  return {
    tone: data.status === 'down' ? 'crit' : 'warn',
    label: 'API degraded',
    detail: failing.length > 0 ? failing.join(', ') : undefined,
  };
}
