// Tests for the incident helpers: the filter, the duration, and what "Declare incident" prefills from an alert.
import { describe, expect, it } from 'vitest';
import type { AlertEvent } from '../../types';
import {
  BLANK_INCIDENT,
  DEFAULT_INCIDENT_CHOICE,
  INCIDENT_CHOICES,
  UPDATE_STATUS_OPTIONS,
  componentsFor,
  declareDefaults,
  incidentDuration,
  incidentFilters,
  incidentSeverityFor,
  parseIncidentChoice,
  splitKeys,
  updateStatusFor,
} from './incidents';

const alert = (over: Partial<AlertEvent> = {}): AlertEvent => ({
  id: 31,
  ruleId: 1,
  value: 23.4,
  subjectType: 'supplier',
  subjectId: 3,
  startedAt: '2026-10-31T10:20:00.000Z',
  acknowledgedAt: null,
  resolvedAt: null,
  status: 'firing',
  severity: 'critical',
  rule: {
    id: 1,
    key: 'supplier_timeout_rate',
    name: 'Supplier timeouts',
    metric: 'supplier.timeout_rate',
    comparator: 'gt',
    threshold: 20,
    windowSeconds: 180,
    unit: 'percent',
  },
  subjectLabel: 'Rapid IMEI',
  acknowledgedBy: null,
  note: null,
  incidentId: null,
  ...over,
});

describe('the filter', () => {
  it('offers Ongoing (the default), Resolved and All, and reads ?status=', () => {
    expect(INCIDENT_CHOICES.map((choice) => choice.label)).toEqual(['Ongoing', 'Resolved', 'All']);
    expect(DEFAULT_INCIDENT_CHOICE).toBe('ongoing');
    expect(parseIncidentChoice('resolved')).toBe('resolved');
    expect([null, 'x', 'open'].map(parseIncidentChoice)).toEqual(['ongoing', 'ongoing', 'ongoing']);
  });

  it('asks the server for the open ones, the resolved ones, or everything', () => {
    expect(incidentFilters('ongoing')).toEqual({ open: true });
    expect(incidentFilters('resolved')).toEqual({ status: 'resolved' });
    expect(incidentFilters('all')).toEqual({});
  });
});

describe('incidentDuration', () => {
  const now = Date.parse('2026-10-31T12:00:00.000Z');

  it('counts to now while the incident is not resolved', () => {
    expect(incidentDuration({ startedAt: '2026-10-31T11:32:00.000Z', resolvedAt: null }, now)).toEqual({
      text: '28m',
      ongoing: true,
    });
  });

  it('counts to the resolve time once it is closed', () => {
    expect(
      incidentDuration(
        { startedAt: '2026-10-30T10:00:00.000Z', resolvedAt: '2026-10-30T11:12:00.000Z' },
        now,
      ),
    ).toEqual({ text: '1h\u00a012m', ongoing: false });
  });

  it('is null without a start, or with a time that cannot be read', () => {
    expect(incidentDuration({ startedAt: null, resolvedAt: null }, now)).toBeNull();
    expect(incidentDuration({ startedAt: 'soon', resolvedAt: null }, now)).toBeNull();
    expect(incidentDuration({ startedAt: '2026-10-31T11:00:00.000Z', resolvedAt: 'later' }, now)).toBeNull();
  });
});

describe('the update statuses', () => {
  it('leave out resolved, which is Close incident', () => {
    expect(UPDATE_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'investigating',
      'identified',
      'monitoring',
    ]);
    expect(updateStatusFor('identified')).toBe('identified');
    expect(updateStatusFor('resolved')).toBe('investigating');
  });
});

describe('what Declare incident prefills from an alert', () => {
  it('maps the alert severity to an incident severity the staff member can change', () => {
    expect(incidentSeverityFor('critical')).toBe('critical');
    expect(incidentSeverityFor('warning')).toBe('major');
    expect(incidentSeverityFor('info')).toBe('minor');
  });

  it('points at the supplier of a supplier alert and at the workers for a queue alert, and at nothing else', () => {
    expect(componentsFor({ subjectType: 'supplier', subjectId: 3 })).toEqual(['supplier:3']);
    expect(componentsFor({ subjectType: 'queue', subjectId: 0 })).toEqual(['workers']);
    expect(componentsFor({ subjectType: 'system', subjectId: 0 })).toEqual([]);
    expect(componentsFor({ subjectType: 'ledger_account', subjectId: 87 })).toEqual([]);
  });

  it('fills the title, severity, components and a summary that says what was measured', () => {
    const values = declareDefaults(alert());
    expect(values.title).toBe('Supplier timeouts · Rapid IMEI');
    expect(values.severity).toBe('critical');
    expect(values.components).toEqual(['supplier:3']);
    expect(values.summary).toMatch(
      /^Supplier timeouts for Rapid IMEI: 23\.4 % > 20 % for 3m\. Started at \d{2}:\d{2}\.$/,
    );
  });

  it('leaves the subject out of the title for an alert about the whole platform', () => {
    const values = declareDefaults(alert({ subjectType: 'system', subjectId: 0, subjectLabel: null }));
    expect(values.title).toBe('Supplier timeouts');
    expect(values.components).toEqual([]);
    expect(values.summary).toMatch(/^Supplier timeouts: 23\.4 %/);
  });

  it('starts blank when there is no alert', () => {
    expect(BLANK_INCIDENT).toEqual({ title: '', severity: 'major', components: [], summary: '' });
  });
});

describe('splitKeys', () => {
  it('splits typed keys on commas, trims them and drops empty ones and repeats', () => {
    expect(splitKeys('api, supplier:3 ,, api,')).toEqual(['api', 'supplier:3']);
    expect(splitKeys('')).toEqual([]);
  });
});
