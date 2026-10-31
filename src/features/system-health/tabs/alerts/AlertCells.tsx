// The cells of the alerts table: the rule, the subject, when it started, its status and who acknowledged it. Each cell is
// also a line of the phone card (label: value), so every one reads on its own.
import { Link } from 'react-router';
import { ageText, ago, fmtDate } from '@/lib/format';
import { MetaBadge } from '../../components';
import { alertStatusMeta, healthPath } from '../../lib';
import type { AlertEvent } from '../../types';
import { acknowledgedBy, subjectText } from './condition';

/** The rule's name, with its key in mono under it. */
export function RuleCell({ alert }: { alert: AlertEvent }) {
  return (
    <div className="min-w-0">
      <div className="font-medium">{alert.rule.name}</div>
      <div className="mono font-normal text-ink3">{alert.rule.key}</div>
    </div>
  );
}

/** What the alert is about: a supplier, a queue (mono, it is a code), an account or the whole platform. */
export function SubjectCell({ alert }: { alert: AlertEvent }) {
  const subject = subjectText(alert);
  return (
    <div className="min-w-0">
      <div className={subject.code ? 'mono' : undefined}>{subject.name}</div>
      {subject.kind && <div className="text-xs text-ink3">{subject.kind}</div>}
    </div>
  );
}

/** "35m ago", with the full time on hover, and for a resolved alert how long it lasted. */
export function StartedCell({ alert, now }: { alert: AlertEvent; now: number }) {
  const { startedAt, resolvedAt } = alert;
  if (!startedAt) return <span className="text-ink3">–</span>;
  const lasted = resolvedAt ? Date.parse(resolvedAt) - Date.parse(startedAt) : Number.NaN;
  return (
    <div className="whitespace-nowrap" title={fmtDate(startedAt)}>
      <div>{ago(startedAt, now)}</div>
      {Number.isFinite(lasted) && <div className="text-xs text-ink3">lasted {ageText(lasted)}</div>}
    </div>
  );
}

/** Who acknowledged it and when, and their note. The table renders it only for an acknowledged alert (`acknowledgedBy`). */
export function AckCell({ alert, now }: { alert: AlertEvent; now: number }) {
  const { acknowledgedAt, note } = alert;
  return (
    <div className="min-w-0">
      <div className="whitespace-nowrap">
        {acknowledgedBy(alert)} <span className="text-ink3">· {ago(acknowledgedAt, now)}</span>
      </div>
      {note && (
        <div className="text-xs text-ink3 md:line-clamp-2 md:max-w-[28ch]" title={note}>
          {note}
        </div>
      )}
    </div>
  );
}

export interface StatusCellProps {
  alert: AlertEvent;
  now: number;
  /** The staff member may open the Incidents view, so the incident of this alert is a link. */
  canReadIncidents: boolean;
}

/**
 * The status badge, who acknowledged it (the "Acknowledged by" column needs the width of a 1,536px window, so below that
 * the same lines sit under the badge, from a tablet up; a phone card has its own line for it), and the incident declared
 * from this alert when there is one.
 */
export function StatusCell({ alert, now, canReadIncidents }: StatusCellProps) {
  const { incidentId } = alert;
  return (
    <div className="flex flex-col items-start gap-1">
      <MetaBadge meta={alertStatusMeta(alert.status)} />
      {acknowledgedBy(alert) && (
        <div className="hidden text-xs md:block 2xl:hidden">
          <AckCell alert={alert} now={now} />
        </div>
      )}
      {incidentId !== null &&
        (canReadIncidents ? (
          <Link
            className="link text-xs"
            to={healthPath('alerts', { view: 'incidents', incident: incidentId })}
          >
            Incident #{incidentId}
          </Link>
        ) : (
          <span className="text-xs text-ink3">Incident #{incidentId}</span>
        ))}
    </div>
  );
}
