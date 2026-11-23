// Starts a publish run from another screen (the services list's ticked rows, a supplier's services, Quick add's own run) and opens it in
// the Shop Publish view. The other features reach it through the storefront index (`useStartPublish`). The server's refusal (nothing to
// publish, too many services, an unknown supplier) shows as a toast, since those screens have no error slot of their own.
import { useNavigate } from 'react-router';
import { toast } from '@/components/ui';
import { refusalText } from '../lib/publish';
import { storefrontPublishPath } from '../lib/paths';
import type { CreatePublishRunBody } from '../types';
import { useCreatePublishRun } from './usePublishMutations';

/** `start(body)` creates the run and goes to `/products?view=publish&run=<id>`; `pending` is true while the request runs. */
export function useStartPublish() {
  const navigate = useNavigate();
  const create = useCreatePublishRun();
  const start = (body: CreatePublishRunBody) =>
    create.mutate(body, {
      onSuccess: (run) => void navigate(storefrontPublishPath(run.id)),
      onError: (error) =>
        toast({ kind: 'error', title: 'Could not prepare the preview', body: refusalText(error), ttl: 8000 }),
    });
  return { start, pending: create.isPending };
}
