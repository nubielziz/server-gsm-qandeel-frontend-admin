// Tests for the data-provider registry: which Refine operations each System health resource offers, and that the
// feature's manifest hands the registry to the app.
import { describe, expect, it } from 'vitest';
import { mergeRegistries } from '@/lib/api';
import { manifest } from '../manifest';
import { listAlerts } from './alerts';
import { systemHealthResources } from './resources';

const operations = (name: string) => Object.keys(systemHealthResources[name]).sort();

describe('systemHealthResources', () => {
  it('registers alerts, alert rules and incidents', () => {
    expect(Object.keys(systemHealthResources).sort()).toEqual(['alert-rules', 'alerts', 'incidents']);
  });

  it('offers each resource only the operations its endpoints have', () => {
    expect(operations('alerts')).toEqual(['list', 'show']);
    expect(operations('alert-rules')).toEqual(['create', 'delete', 'list', 'show', 'update']);
    expect(operations('incidents')).toEqual(['create', 'list', 'show', 'update']);
  });

  it('serves a list with the same function the hooks call', () => {
    expect(systemHealthResources.alerts.list).toBe(listAlerts);
  });

  it('is the registry of the feature manifest, and merges with another registry without a clash', () => {
    expect(manifest.registry).toBe(systemHealthResources);
    expect(() => mergeRegistries(systemHealthResources, { orders: {} })).not.toThrow();
  });
});
