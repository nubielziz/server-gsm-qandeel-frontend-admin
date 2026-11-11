// CampaignPage: one campaign (`/notifications/:id`). It reads the campaign and shows the not-found state for an unknown id, a loading skeleton, an error with
// Retry, or the campaign. The breadcrumb and the tab title carry the campaign's name. The page only composes; `CampaignView` draws the campaign.
import { useParams } from 'react-router';
import { useBreadcrumbTitle } from '@/app/layout/breadcrumbTitle';
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SkeletonStat,
  SkeletonTable,
} from '@/components/ui';
import { CampaignView } from '../components/CampaignView';
import { useBroadcastGrants } from '../hooks/useBroadcastGrants';
import { useCampaign } from '../hooks/useCampaign';
import { notificationsListPath } from '../lib/filters';

export function CampaignPage() {
  const params = useParams();
  const id = params.id && /^\d+$/.test(params.id) ? Number(params.id) : undefined;
  const grants = useBroadcastGrants();
  const { campaign, notFound, query } = useCampaign(id);
  useBreadcrumbTitle(campaign?.name);

  if (id === undefined || notFound) {
    return (
      <>
        <PageHeader title="Campaign" />
        <Panel>
          <EmptyState
            icon="bell"
            title="Campaign not found"
            cta={
              <ButtonLink to={notificationsListPath()} size="sm">
                Back to notifications
              </ButtonLink>
            }
          >
            There is no campaign with this number, or it was deleted.
          </EmptyState>
        </Panel>
      </>
    );
  }
  if (campaign) return <CampaignView campaign={campaign} grants={grants} />;
  if (query.isError) {
    return (
      <>
        <PageHeader title="Campaign" />
        <Panel flush>
          <ErrorState
            title="Could not load the campaign"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </Panel>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Campaign" />
      <SkeletonStat cells={4} />
      <Panel flush>
        <SkeletonTable cols={4} rows={5} />
      </Panel>
    </>
  );
}
