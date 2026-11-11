// NotificationsPage: "Notifications" (`/notifications`): the campaigns staff wrote, a name search, status and purpose filters, a pager and "New campaign"
// (the composer opens in a drawer). A row opens the campaign. The filters and page live in the address; the page only composes.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Icon, PageHeader, Panel, usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import { CampaignComposer } from '../components/CampaignComposer';
import { CampaignsEmpty } from '../components/CampaignsEmpty';
import { CampaignsTable } from '../components/CampaignsTable';
import { CampaignsToolbar } from '../components/CampaignsToolbar';
import { useBroadcastGrants } from '../hooks/useBroadcastGrants';
import { useCampaigns } from '../hooks/useCampaigns';
import { useNotificationsView } from '../hooks/useNotificationsView';
import { campaignPath, hasFilters, PAGE_SIZE } from '../lib/filters';

export function NotificationsPage() {
  const grants = useBroadcastGrants();
  const view = useNotificationsView();
  const now = useNow();
  const navigate = useNavigate();
  const [composing, setComposing] = useState(false);
  const list = useCampaigns({ filters: view.filters, page: view.page, enabled: grants.ready });
  // A shrinking list (a delete, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  const create = grants.needs('broadcasts:send');

  return (
    <>
      <PageHeader
        title="Notifications"
        sub="Messages you write once and send to staff, merchants or customers, in the app, by email or on Telegram."
        actions={
          grants.canSend && (
            <Button variant="primary" onClick={() => setComposing(true)} {...create}>
              <Icon name="plus" className="ic-sm" />
              New campaign
            </Button>
          )
        }
      />
      <Panel title="Campaigns" flush>
        <CampaignsToolbar
          filters={view.filters}
          onChange={view.setFilters}
          onClear={view.clearFilters}
          total={list.total}
        />
        <div className="border-t border-line">
          <CampaignsTable
            rows={list.rows}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            now={now}
            page={view.page}
            total={list.total ?? list.rows.length}
            onPageChange={view.setPage}
            onOpen={(campaign) => void navigate(campaignPath(campaign.id))}
            empty={
              <CampaignsEmpty
                filtered={hasFilters(view.filters)}
                canWrite={grants.canSend}
                onClear={view.clearFilters}
                onCreate={() => setComposing(true)}
              />
            }
          />
        </div>
      </Panel>
      <CampaignComposer
        open={composing}
        onClose={() => setComposing(false)}
        onSaved={(campaign) => void navigate(campaignPath(campaign.id))}
      />
    </>
  );
}
