// The plain values the shop parts take from their host (the service editor). No type of another feature is used here.
import type { Id } from '@/lib/api';

/**
 * The failed publish of a service that has no shop page: the run, the server's reason (a word of the publish screens' lists, shown
 * in their words), its detail, and when it was tried.
 */
export type ShopPublishFailure = {
  runId: Id;
  reason: string;
  detail?: string | null;
  at: string;
};
