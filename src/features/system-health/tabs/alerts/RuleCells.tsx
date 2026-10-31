// The cells of the rules table: the name, the condition, the on/off switch and the mute, and the Mute or Unmute button. Each
// cell is also a line of the phone card (label: value), so every one reads on its own.
import { Badge, Switch } from '@/components/ui';
import { ActionButton } from '../../components';
import { whenText } from '../../lib';
import { useHealthGrants } from '../../hooks';
import type { AlertRule } from '../../types';
import { limitText } from './condition';
import { isMuted } from './rules';

/** The rule's name, its key in mono under it, and a badge while an alert of the rule is open (the server says so). */
export function RuleNameCell({ rule, now }: { rule: AlertRule; now: number }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{rule.name}</span>
        {rule.open && (
          <Badge tone="serious" icon="bell">
            Alert open
          </Badge>
        )}
      </div>
      <div className="mono font-normal text-ink3">{rule.key}</div>
      {/* Below xl the Muted column gives way so the row's buttons fit; the mute then reads here. */}
      {isMuted(rule, now) && (
        <div className="text-xs text-ink3 xl:hidden">Muted until {whenText(rule.mutedUntil, now)}</div>
      )}
    </div>
  );
}

/** The metric in mono, then the limit: "supplier.timeout_rate > 20 % for 3m". The limit never breaks in the middle. */
export function RuleConditionCell({ rule }: { rule: AlertRule }) {
  return (
    <span className="tabular-nums">
      <span className="mono">{rule.metric}</span> <span className="whitespace-nowrap">{limitText(rule)}</span>
    </span>
  );
}

export interface ActiveCellProps {
  rule: AlertRule;
  /** The value being saved for this rule's switch, or undefined when nothing is. It shows at once, until the save ends. */
  pending: boolean | undefined;
  /** A change to any rule is being saved: the switches wait, so two quick clicks cannot hide each other's value. */
  busy: boolean;
  onChange: (next: boolean) => void;
}

/**
 * The switch (`isActive`). A read-only staff member sees the word instead of a control. With some write permissions but
 * not `alerts:update` the switch is disabled and its title names the permission.
 */
export function ActiveCell({ rule, pending, busy, onChange }: ActiveCellProps) {
  const grants = useHealthGrants();
  if (!grants.ready) return null;
  if (grants.readOnly) return <span>{rule.isActive ? 'On' : 'Off'}</span>;
  const need = grants.needs('alerts:update');
  return (
    <span className="inline-flex" title={need.title}>
      <Switch
        checked={pending ?? rule.isActive}
        onChange={onChange}
        label={`Enable ${rule.name}`}
        disabled={need.disabled || busy}
      />
    </span>
  );
}

export interface MutedCellProps {
  rule: AlertRule;
  now: number;
}

/**
 * The mute as plain text under the "Muted" heading: "Until 01 Nov, 07:33" while it lasts, otherwise a dash. It is a state,
 * not a control (a button here read as the value, "Muted: Mute"); Mute and Unmute sit with the other buttons (`MuteAction`).
 */
export function MutedCell({ rule, now }: MutedCellProps) {
  if (!isMuted(rule, now)) return <span className="text-ink3">–</span>;
  return <span className="whitespace-nowrap">Until {whenText(rule.mutedUntil, now)}</span>;
}

export interface MuteActionProps {
  rule: AlertRule;
  now: number;
  /** An unmute is being saved for this rule. */
  unmuting: boolean;
  /** A change to any rule is being saved. */
  busy: boolean;
  onMute: () => void;
  onUnmute: () => void;
}

/**
 * The one button that changes the mute: Unmute (acts at once) while the rule is muted, otherwise Mute (opens its dialog).
 * It sits in the row's buttons beside Edit, so a rule always shows the same set.
 */
export function MuteAction({ rule, now, unmuting, busy, onMute, onUnmute }: MuteActionProps) {
  if (!isMuted(rule, now)) {
    return (
      <ActionButton permission="alerts:update" size="sm" onClick={onMute}>
        Mute
      </ActionButton>
    );
  }
  return (
    <ActionButton permission="alerts:update" size="sm" loading={unmuting} disabled={busy} onClick={onUnmute}>
      Unmute
    </ActionButton>
  );
}
