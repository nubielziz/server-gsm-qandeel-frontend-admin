// The System health page (/system-health): header, verdict, key figures, a read-only note and the seven tabs. No demo page;
// the design is docs/system-health-design.md. The page only composes: each part reads its own data.
import { PageHeader } from '@/components/ui';
import { NoStatusAccess } from '../header/NoStatusAccess';
import { ReadOnlyNote } from '../header/ReadOnlyNote';
import { StatusSection } from '../header/StatusSection';
import { SystemHealthHeader } from '../header/SystemHealthHeader';
import { useHealthGrants } from '../hooks';
import { HealthTabs } from './HealthTabs';

/**
 * The verdict and the key figures need `system:read`; a role with only `alerts:read` or `incidents:read` gets a one-line
 * note in their place and the tabs it may read. A read-only role gets a quiet note and no action buttons anywhere.
 */
export function SystemHealthPage() {
  const grants = useHealthGrants();
  // `me` has loaded before any page opens, so this is a moment at most; the permission hints need it.
  if (!grants.ready) return <PageHeader title="System health" />;

  const canReadStatus = grants.can('system:read');
  return (
    <>
      <SystemHealthHeader canReadStatus={canReadStatus} />
      {canReadStatus ? <StatusSection /> : <NoStatusAccess />}
      {grants.readOnly && <ReadOnlyNote />}
      <HealthTabs grants={grants} />
    </>
  );
}
