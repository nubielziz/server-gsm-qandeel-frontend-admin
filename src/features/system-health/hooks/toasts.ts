// The success toasts of the System health actions. Each says what changed in a few plain words. They are built from what
// the staff member sent (and, for a retry, from the count the server answered), not from the rest of the answer, so a
// server that answers with an empty body still gets a correct toast.
import { fmtDate, num } from '@/lib/format';
import type { Toast } from '@/lib/query';
import type {
  AlertRule,
  Incident,
  MaintenanceScope,
  PauseQueueBody,
  SetMaintenanceBody,
  UpdateAlertRuleBody,
  UpdateIncidentBody,
} from '../types';

/** How a write tells about a refusal. Every System health mutation hook takes it, so each control decides. */
export interface MutationToastOptions {
  /**
   * `false` when a dialog answers the write: the dialog shows the server's error itself, and a toast would repeat it.
   * `true` for a control without a dialog (a switch, Unmute), so a refusal is never silent.
   */
  toastErrors: boolean;
}

const NO_ERROR_TOAST = () => false as const;

/** The error-toast part of a mutation's options: nothing (keep the default toast) or the toast turned off. */
export function errorToast({ toastErrors }: MutationToastOptions) {
  return toastErrors ? {} : { errorNotification: NO_ERROR_TOAST };
}

/** The scope in a sentence: "Maintenance is on for checkout". */
const SCOPE_PHRASE: Record<MaintenanceScope, string> = {
  store: 'the store',
  checkout: 'checkout',
  api_orders: 'API orders',
  all: 'the store, checkout and API orders',
};

/** Maintenance switched on (or changed) for a scope, or switched off. */
export function maintenanceToast(body: SetMaintenanceBody): Toast {
  if (!body.enabled) {
    return { message: 'Maintenance is off', description: 'Customers can use the platform again.' };
  }
  return {
    message: `Maintenance is on for ${SCOPE_PHRASE[body.scope]}`,
    description: 'Customers get 503 MAINTENANCE with your message until you turn it off.',
  };
}

/** Failed jobs sent back to waiting. The server's count may be 0 when the job was already gone. */
export function retryToast(queue: string, retried: number): Toast {
  if (retried === 0)
    return { message: 'No failed jobs were retried', description: `Nothing changed in ${queue}.` };
  return {
    message: `Retried ${num(retried)} failed ${retried === 1 ? 'job' : 'jobs'}`,
    description: `They are waiting in ${queue} again.`,
  };
}

/** A queue paused or resumed. */
export function pauseToast(queue: string, body: PauseQueueBody): Toast {
  return body.paused
    ? { message: `${queue} paused`, description: 'Workers stop taking jobs. Waiting jobs stay queued.' }
    : { message: `${queue} resumed`, description: 'Workers take jobs from it again.' };
}

/** A scheduled job started by hand. */
export function runJobToast(name: string): Toast {
  return {
    message: `${name} started`,
    description: 'It runs now, outside its schedule (recorded as manual).',
  };
}

/** The integrity check queued. */
export function integrityToast(): Toast {
  return {
    message: 'Integrity check started',
    description: 'It runs in the background and only reads the ledger. The result appears on this tab.',
  };
}

/** A supplier paused or put back to work from the Orders & suppliers tab. */
export function supplierToast(name: string, status: 'paused' | 'active'): Toast {
  return status === 'paused'
    ? {
        message: `${name} paused`,
        description: 'New orders go to the next supplier by priority. Orders already sent stay as they are.',
      }
    : { message: `${name} resumed`, description: 'It can receive new orders again.' };
}

/** An alert acknowledged. */
export function ackToast(): Toast {
  return {
    message: 'Alert acknowledged',
    description: 'The reminders stop. Your name and the time are recorded.',
  };
}

/**
 * A rule changed. One field in the body means one clear sentence (muted, unmuted, switched on or off); anything else
 * is "Rule updated". The rule's name comes from the server's answer when it is there.
 */
export function ruleUpdateToast(body: UpdateAlertRuleBody, rule: Pick<AlertRule, 'name'> | undefined): Toast {
  const name = rule?.name;
  const single = Object.keys(body).length === 1;
  if (single && body.mutedUntil !== undefined) {
    return body.mutedUntil === null
      ? { message: 'Rule unmuted', description: name ? `${name} alerts again.` : undefined }
      : {
          message: 'Rule muted',
          description: `${name ?? 'It'} stays quiet until ${fmtDate(body.mutedUntil)}.`,
        };
  }
  if (single && body.isActive !== undefined) {
    return body.isActive
      ? { message: 'Rule switched on', description: name ? `${name} alerts again.` : undefined }
      : {
          message: 'Rule switched off',
          description: `${name ?? 'It'} will not alert until you switch it on.`,
        };
  }
  return { message: 'Rule updated', description: name };
}

/**
 * An incident updated: closed (with the root cause), a timeline update posted, or a plain edit. The incident's title
 * comes from the server's answer when it is there.
 */
export function incidentUpdateToast(
  body: UpdateIncidentBody,
  incident: Pick<Incident, 'title'> | undefined,
): Toast {
  const title = incident?.title;
  if (body.status === 'resolved') return { message: 'Incident closed', description: title };
  if (body.update !== undefined) {
    return {
      message: 'Update posted',
      description: title ? `It is on the timeline of ${title}.` : 'It is on the timeline.',
    };
  }
  return { message: 'Incident updated', description: title };
}
