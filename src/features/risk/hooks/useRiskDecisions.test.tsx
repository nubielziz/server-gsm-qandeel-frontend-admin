// The refund of a held order: blocking the buyer's email refreshes the buyer's account record (the `clients` resource, by the account
// number the queue carries), not the retired customer record; a plain refund leaves the account alone.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeldOrder } from '../types';

const invalidate = vi.fn(() => Promise.resolve());
const refundHeldOrder = vi.fn(() => Promise.resolve());

vi.mock('@refinedev/core', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useInvalidate: () => invalidate,
  useNotification: () => ({ open: vi.fn() }),
  useOnError: () => ({ mutate: vi.fn() }),
}));
vi.mock('../api', () => ({ approveHeldOrder: vi.fn(), refundHeldOrder }));
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: vi.fn(),
}));

const { useRefundHeldOrder } = await import('./useRiskDecisions');

const held = {
  orderId: 20490,
  customer: { id: 110, name: 'Tyler Brooks', email: 'tyler@inbox.example', country: 'US' },
} as unknown as HeldOrder;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

async function refund(body: { reason: string; blockEmail: boolean; blockDevice: boolean }) {
  const { result } = renderHook(() => useRefundHeldOrder(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ order: held, body });
  });
  await waitFor(() => expect(invalidate).toHaveBeenCalled());
}

const resources = () =>
  (invalidate.mock.calls as unknown as [{ resource: string; id?: number }][]).map(([call]) => ({
    resource: call.resource,
    id: call.id,
  }));

describe('useRefundHeldOrder', () => {
  beforeEach(() => {
    invalidate.mockClear();
    refundHeldOrder.mockClear();
  });

  it('refreshes the buyer’s account record, by its account number, when the email is blocked', async () => {
    await refund({ reason: 'Stolen card', blockEmail: true, blockDevice: false });
    expect(resources()).toContainEqual({ resource: 'clients', id: 110 });
    expect(resources().some((call) => call.resource === 'customers')).toBe(false);
  });

  it('leaves the account alone when nothing is blocked', async () => {
    await refund({ reason: 'Goodwill', blockEmail: false, blockDevice: true });
    expect(resources().some((call) => call.resource === 'clients')).toBe(false);
    expect(resources()).toContainEqual({ resource: 'orders', id: 20490 });
  });
});
