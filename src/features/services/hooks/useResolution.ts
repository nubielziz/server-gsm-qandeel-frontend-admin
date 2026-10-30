// The price of one service for one merchant, with the steps the server took to get there. Ports the data side of resolverTab in
// 43-p-services.js (`resolveWith` ran in the browser; the server resolves here). The result is not kept long: any price, rule
// or group change outdates it, and the mutations invalidate `RESOLVE_KEY`.
import { useApiQuery } from '@/lib/query';
import { resolvePrice } from '../api';
import { RESOLVE_KEY } from './keys';

/** Waits until both a service and a merchant are chosen. */
export function useResolution(serviceId: number | null, clientId: number | null) {
  return useApiQuery({
    queryKey: [...RESOLVE_KEY, serviceId, clientId],
    queryFn: ({ signal }) =>
      resolvePrice({ serviceId: serviceId as number, clientId: clientId as number }, { signal }),
    enabled: serviceId !== null && clientId !== null,
  });
}
