// Tests of how the System health mock follows the rest of the mock layer: a supplier paused or disabled on the Suppliers
// page shows in the health tables, and the state is seeded again when the scenario changes or the mock is reset.
import { describe, expect, it } from 'vitest';
import { apiDelete, apiGet, apiList, apiPatch, apiPost } from '@/lib/api';
import { setMockScenario } from '@/mocks/scenario';
import type { AlertEvent, AlertRule, SuppliersHealth, SystemHealth } from '../types';
import { mocks } from '.';
import { setupHealthMocks } from './testing';

setupHealthMocks();

describe('suppliers and the scenario switch', () => {
  it('shows a supplier paused on the Suppliers page, as paused, in the next read', async () => {
    setMockScenario('degraded');
    await apiPatch('/admin/suppliers/3', { status: 'paused' });
    const { suppliers } = await apiGet<SuppliersHealth>('/admin/system/suppliers');
    expect(suppliers.find((supplier) => supplier.id === 3)).toMatchObject({
      status: 'paused',
      health: 'down',
    });
    await apiPatch('/admin/suppliers/3', { status: 'active' });
    expect(
      (await apiGet<SuppliersHealth>('/admin/system/suppliers')).suppliers.find((s) => s.id === 3)?.status,
    ).toBe('active');
  });

  it('treats a disabled supplier as unchecked: unknown, never ok', async () => {
    setMockScenario('healthy');
    await apiPatch('/admin/suppliers/5', { status: 'disabled' });
    const { suppliers } = await apiGet<SuppliersHealth>('/admin/system/suppliers');
    expect(suppliers.find((supplier) => supplier.id === 5)).toMatchObject({
      status: 'disabled',
      health: 'unknown',
      lastSuccessAt: null,
      latency: { value: null, state: 'unknown' },
    });
    const health = await apiGet<SystemHealth>('/admin/system/health');
    expect(health.components.find((component) => component.key === 'supplier:5')).toMatchObject({
      status: 'unknown',
      lastCheckedAt: null,
    });
  });

  it('seeds again when the scenario changes, and when the mock is reset', async () => {
    setMockScenario('degraded');
    const [alert] = (await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing' } })).data;
    await apiPost(`/admin/alerts/${alert.id}/ack`, {});
    await apiDelete('/admin/alert-rules/10');
    setMockScenario('healthy');
    expect((await apiGet<SystemHealth>('/admin/system/health')).alerts.items).toEqual([]);
    setMockScenario('degraded');
    expect((await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing' } })).total).toBe(2);
    expect((await apiList<AlertRule>('/admin/alert-rules')).total).toBe(10);

    await apiPost(`/admin/alerts/${alert.id}/ack`, {});
    mocks.reset?.();
    expect((await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing' } })).total).toBe(2);
  });
});
