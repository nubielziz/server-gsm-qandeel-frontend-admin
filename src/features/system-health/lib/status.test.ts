// Tests for status.ts: every status has a word, an icon and a tone, unknown is never green, problems sort first.
import { describe, expect, it } from 'vitest';
import {
  alertSeverityMeta,
  alertStatusMeta,
  circuitMeta,
  compareStatus,
  incidentSeverityMeta,
  incidentStatusMeta,
  integrityMeta,
  jobRunMeta,
  metricStateMeta,
  problemRank,
  sortProblemsFirst,
  statusMeta,
  toneTextClass,
  type HealthStatus,
} from './status';

const ALL: HealthStatus[] = [
  'operational',
  'degraded',
  'outage',
  'ok',
  'down',
  'warn',
  'crit',
  'paused',
  'unknown',
];

describe('statusMeta', () => {
  it('names every overall status, check status, measure state and paused', () => {
    expect(statusMeta('operational')).toEqual({ tone: 'good', icon: 'checkCircle', word: 'Operational' });
    expect(statusMeta('degraded')).toEqual({ tone: 'warn', icon: 'alert', word: 'Degraded' });
    expect(statusMeta('outage')).toEqual({ tone: 'crit', icon: 'xCircle', word: 'Outage' });
    expect(statusMeta('ok')).toEqual({ tone: 'good', icon: 'checkCircle', word: 'OK' });
    expect(statusMeta('down')).toEqual({ tone: 'crit', icon: 'xCircle', word: 'Down' });
    expect(statusMeta('warn')).toEqual({ tone: 'warn', icon: 'alert', word: 'Warn' });
    expect(statusMeta('crit')).toEqual({ tone: 'crit', icon: 'xCircle', word: 'Critical' });
    expect(statusMeta('paused')).toEqual({ tone: 'neutral', icon: 'pause', word: 'Paused' });
    expect(statusMeta('unknown')).toEqual({ tone: 'neutral', icon: 'info', word: 'Unknown' });
  });

  it('gives each status an icon and a word, so none is colour alone', () => {
    for (const status of ALL) {
      const meta = statusMeta(status);
      expect(meta.icon).not.toBe('');
      expect(meta.word.length).toBeGreaterThan(0);
    }
  });

  it('is green only for operational and ok', () => {
    const green = ALL.filter((status) => statusMeta(status).tone === 'good');
    expect(green.sort()).toEqual(['ok', 'operational']);
  });

  it('shows a status it does not know as neutral with the raw text, and never throws', () => {
    expect(statusMeta('exploding' as HealthStatus)).toEqual({
      tone: 'neutral',
      icon: 'info',
      word: 'exploding',
    });
    expect(statusMeta('constructor' as HealthStatus).tone).toBe('neutral');
  });

  it('reads a measure state the same way', () => {
    expect(metricStateMeta('crit')).toEqual(statusMeta('crit'));
  });
});

describe('severities, statuses and states of the other tabs', () => {
  it('words alert severities and statuses', () => {
    expect(alertSeverityMeta('info').word).toBe('Info');
    expect(alertSeverityMeta('warning')).toMatchObject({ word: 'Warning', tone: 'warn' });
    expect(alertSeverityMeta('critical')).toMatchObject({ word: 'Critical', tone: 'crit' });
    expect(alertStatusMeta('firing')).toMatchObject({ word: 'Firing', tone: 'serious', icon: 'bell' });
    expect(alertStatusMeta('acknowledged').word).toBe('Acknowledged');
    expect(alertStatusMeta('resolved')).toMatchObject({ word: 'Resolved', tone: 'good' });
  });

  it('words incident severities and statuses', () => {
    expect(incidentSeverityMeta('minor')).toMatchObject({ word: 'Minor', tone: 'warn' });
    expect(incidentSeverityMeta('major')).toMatchObject({ word: 'Major', tone: 'serious' });
    expect(incidentSeverityMeta('critical')).toMatchObject({ word: 'Critical', tone: 'crit' });
    expect(incidentStatusMeta('investigating').word).toBe('Investigating');
    expect(incidentStatusMeta('identified').word).toBe('Identified');
    expect(incidentStatusMeta('monitoring').word).toBe('Monitoring');
    expect(incidentStatusMeta('resolved')).toMatchObject({ word: 'Resolved', tone: 'good' });
  });

  it('words circuit states with an icon, a word and a hint', () => {
    expect(circuitMeta('closed')).toMatchObject({ word: 'Closed', tone: 'good' });
    expect(circuitMeta('open')).toMatchObject({ word: 'Open', tone: 'crit', icon: 'ban' });
    expect(circuitMeta('half_open')).toMatchObject({ word: 'Half open', tone: 'warn', icon: 'refresh' });
    for (const state of ['closed', 'open', 'half_open'] as const)
      expect(circuitMeta(state).hint).toBeTruthy();
  });

  it('words job runs and integrity results, with no data never green', () => {
    expect(jobRunMeta('running').word).toBe('Running');
    expect(jobRunMeta('succeeded').tone).toBe('good');
    expect(jobRunMeta('failed').tone).toBe('crit');
    expect(jobRunMeta('skipped').word).toBe('Skipped');
    expect(integrityMeta('pass').tone).toBe('good');
    expect(integrityMeta('fail').tone).toBe('crit');
    expect(integrityMeta('unknown')).toMatchObject({ word: 'Not checked', tone: 'neutral' });
  });

  it('gives each tone a text class for icons outside a badge', () => {
    expect(toneTextClass('crit')).toBe('text-crit-fg');
    expect(toneTextClass('neutral')).toBe('text-ink3');
  });
});

describe('problems first', () => {
  it('ranks critical, warning, unknown, paused, healthy', () => {
    expect(problemRank('outage')).toBe(0);
    expect(problemRank('down')).toBe(0);
    expect(problemRank('crit')).toBe(0);
    expect(problemRank('degraded')).toBe(1);
    expect(problemRank('warn')).toBe(1);
    expect(problemRank('unknown')).toBe(2);
    expect(problemRank('paused')).toBe(3);
    expect(problemRank('operational')).toBe(4);
    expect(problemRank('ok')).toBe(4);
  });

  it('ranks a status it does not know like unknown, not like healthy', () => {
    expect(problemRank('exploding' as HealthStatus)).toBe(problemRank('unknown'));
  });

  it('sorts the worst first and keeps the order of equals', () => {
    const items = [
      { name: 'a', status: 'ok' },
      { name: 'b', status: 'down' },
      { name: 'c', status: 'ok' },
      { name: 'd', status: 'degraded' },
      { name: 'e', status: 'unknown' },
      { name: 'f', status: 'paused' },
      { name: 'g', status: 'down' },
    ] as const;
    const sorted = sortProblemsFirst(items, (item) => item.status);
    expect(sorted.map((item) => item.name)).toEqual(['b', 'g', 'd', 'e', 'f', 'a', 'c']);
    // The input is left alone.
    expect(items.map((item) => item.name)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(compareStatus('ok', 'ok')).toBe(0);
    expect(compareStatus('down', 'ok')).toBeLessThan(0);
  });
});
