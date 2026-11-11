// A wrapper for hook tests: the router and the app's providers (Refine with the real data provider, the query client, toasts), so a hook
// runs as it does in the app and talks to the dev mock API. Import it from tests only.
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/App';

export function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AppProviders>{children}</AppProviders>
    </MemoryRouter>
  );
}
