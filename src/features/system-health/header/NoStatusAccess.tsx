// NoStatusAccess: the quiet line that takes the place of the verdict and the key figures for a staff member who may read
// alerts or incidents but not `system:read` (docs/system-health-design.md, "Permission map").
import { Icon } from '@/components/ui';

/** The status and the key figures come from `system:read`; without it the tabs the role may read are all there is. */
export function NoStatusAccess() {
  return (
    <p className="mb-4 flex items-start gap-2 text-sm text-ink2" role="note">
      <Icon name="lock" className="ic-sm mt-0.5 flex-none text-ink3" />
      <span>
        The overall status and the key figures need the <span className="mono">system:read</span> permission.
        The tabs your role may read are below.
      </span>
    </p>
  );
}
