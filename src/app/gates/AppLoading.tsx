// AppLoading: full-screen wait while the first "am I signed in?" check runs.
import { Icon } from '@/components/ui';

export function AppLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center gap-2 text-sm text-ink3" role="status">
      <Icon name="loader" className="animate-spin" />
      <span>Loading…</span>
    </div>
  );
}
