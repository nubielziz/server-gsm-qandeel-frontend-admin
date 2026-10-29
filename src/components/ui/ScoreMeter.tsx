// ScoreMeter: a 0-100 risk score as a small bar plus the number. Ports scoreMeter(score) of 13-b2c-ui.js.
import { Meter, type MeterTone } from './Meter';

/** Bands from the demo: 80+ critical, 50+ high, 25+ medium, below that neutral. */
function toneFor(score: number): MeterTone {
  if (score >= 80) return 'crit';
  if (score >= 50) return 'serious';
  if (score >= 25) return 'warn';
  return 'neutral';
}

export function ScoreMeter({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <Meter ratio={score / 100} tone={toneFor(score)} className="w-14" />
      <span className="tabular-nums text-xs text-ink2">{score}</span>
    </div>
  );
}
