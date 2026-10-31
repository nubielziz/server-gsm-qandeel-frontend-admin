// Tests for the Overview tab's alert and incident helpers: the order, the alerts the summary counts but does not list,
// and the names of an incident's components.
import { describe, expect, it } from 'vitest';
import type {
  AlertSeverity,
  AlertSummary,
  HealthComponent,
  IncidentSeverity,
  IncidentSummary,
} from '../../types';
import { componentNames, sortAlerts, sortIncidents, unlistedAlerts } from './alertRows';

const alert = (id: number, severity: AlertSeverity): AlertSummary => ({
  id,
  ruleName: `Rule ${id}`,
  severity,
  status: 'firing',
  subjectLabel: null,
  startedAt: null,
});

const incident = (id: number, severity: IncidentSeverity): IncidentSummary => ({
  id,
  title: `Incident ${id}`,
  severity,
  status: 'investigating',
  components: [],
  startedAt: null,
});

describe('sortAlerts', () => {
  it('puts critical first, then warning, then info, and keeps the server order inside a severity', () => {
    const sorted = sortAlerts([
      alert(1, 'info'),
      alert(2, 'warning'),
      alert(3, 'critical'),
      alert(4, 'warning'),
      alert(5, 'critical'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual([3, 5, 2, 4, 1]);
  });

  it('puts a severity it does not know last and does not change the list it was given', () => {
    const list = [alert(1, 'mystery' as AlertSeverity), alert(2, 'info')];
    expect(sortAlerts(list).map((item) => item.id)).toEqual([2, 1]);
    expect(list.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe('sortIncidents', () => {
  it('puts critical first, then major, then minor', () => {
    const sorted = sortIncidents([incident(1, 'minor'), incident(2, 'critical'), incident(3, 'major')]);
    expect(sorted.map((item) => item.id)).toEqual([2, 3, 1]);
  });
});

describe('unlistedAlerts', () => {
  it('counts the open alerts the list leaves out', () => {
    expect(unlistedAlerts(5, 2)).toBe(3);
    expect(unlistedAlerts(2, 2)).toBe(0);
    // A list longer than the count is not a negative number of missing alerts.
    expect(unlistedAlerts(1, 3)).toBe(0);
  });

  it('has nothing to add when the count is unknown (the rules cannot be evaluated)', () => {
    expect(unlistedAlerts(null, 0)).toBe(0);
  });
});

describe('componentNames', () => {
  const known = [
    { key: 'api', name: 'API' },
    { key: 'supplier:3', name: 'Rapid IMEI' },
  ] as HealthComponent[];

  it('gives the name the summary knows for a key, in the order of the keys', () => {
    expect(componentNames(['supplier:3', 'api'], known)).toEqual(['Rapid IMEI', 'API']);
  });

  it('keeps a key the summary does not know, so nothing is dropped', () => {
    expect(componentNames(['gateway:9', 'api'], known)).toEqual(['gateway:9', 'API']);
    expect(componentNames([], known)).toEqual([]);
  });
});
