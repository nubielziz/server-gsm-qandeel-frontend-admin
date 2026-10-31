// StoresTab: the Data stores tab of System health (Postgres and Redis). It reads the two store endpoints
// (`GET /admin/system/database` and `/cache`) and lays out four cards. Presentation only: the server sends every state.
import { PartBoundary } from '../../header/PartBoundary';
import { useCacheHealth, useDatabaseHealth } from '../../hooks';
import { LongTransactionsCard } from './LongTransactionsCard';
import { PostgresCard } from './PostgresCard';
import { RedisCard } from './RedisCard';
import { SlowQueriesCard } from './SlowQueriesCard';
import { settledStatus, storeOrder } from './storeFigures';

/**
 * Cards in a 12-column grid on a wide screen, stacked below it. Each card is a HealthCard around its own read, so a
 * failing read shows its error in its own card and leaves the others alone: Postgres, the slow queries and the long
 * transactions share one read, Redis has its own. Problems first: the store with the worse status takes the first place.
 * When the Postgres read has failed and there is no answer at all, the Postgres card shows the one error (with Retry) and
 * the two lists wait for it, instead of repeating the same error three times.
 */
export function StoresTab() {
  const database = useDatabaseHealth();
  const cache = useCacheHealth();
  const order = storeOrder(settledStatus(database), settledStatus(cache));
  const databaseFailed = database.data === undefined && database.isError;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {order.map((store) =>
        store === 'database' ? (
          <div key={store} className="min-w-0 xl:col-span-6">
            <PartBoundary name="The Postgres card" resetKey={database.dataUpdatedAt}>
              <PostgresCard query={database} />
            </PartBoundary>
          </div>
        ) : (
          <div key={store} className="min-w-0 xl:col-span-6">
            <PartBoundary name="The Redis card" resetKey={cache.dataUpdatedAt}>
              <RedisCard query={cache} />
            </PartBoundary>
          </div>
        ),
      )}
      {!databaseFailed && (
        <>
          <div className="min-w-0 xl:col-span-12">
            <PartBoundary name="The slow queries card" resetKey={database.dataUpdatedAt}>
              <SlowQueriesCard query={database} />
            </PartBoundary>
          </div>
          <div className="min-w-0 xl:col-span-12">
            <PartBoundary name="The long transactions card" resetKey={database.dataUpdatedAt}>
              <LongTransactionsCard query={database} />
            </PartBoundary>
          </div>
        </>
      )}
    </div>
  );
}
