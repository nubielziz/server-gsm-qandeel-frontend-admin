// The app root: error boundary, router, Refine with all its providers, and the toast host.
import { Refine } from '@refinedev/core';
import routerProvider, { UnsavedChangesNotifier } from '@refinedev/react-router';
import { useState, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router';
import { Toaster } from '@/components/ui';
import { apiBaseUrl } from '@/lib/api';
import { AppErrorBoundary } from './AppErrorBoundary';
import { PreferencesProvider } from './layout/PreferencesProvider';
import { accessControlProvider } from './providers/accessControlProvider';
import { authProvider } from './providers/authProvider';
import { createDataProvider } from './providers/dataProvider';
import { notificationProvider } from './providers/notificationProvider';
import { createQueryClient } from './queryClient';
import { dataRegistry, resources } from './resources';
import { AppRoutes } from './routes';

const dataProvider = createDataProvider(dataRegistry, apiBaseUrl());

/**
 * Everything the screens need above them: display preferences, Refine (data, auth, access control, notifications,
 * router and resources), the unsaved-changes guard and the toast host. It expects a router above it.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // Created once per mount and kept across renders (Refine would rebuild nothing either way: same instance).
  const [queryClient] = useState(createQueryClient);
  return (
    <PreferencesProvider>
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider}
        authProvider={authProvider}
        accessControlProvider={accessControlProvider}
        notificationProvider={notificationProvider}
        resources={resources}
        options={{
          disableTelemetry: true,
          // Forms that opt in ask before leaving with unsaved changes (needs <UnsavedChangesNotifier/> below).
          warnWhenUnsavedChanges: true,
          // Off globally: tabs and filters write their own query parameters, and a page that wants its table in the
          // URL turns it on for that table only (decision 002).
          syncWithLocation: false,
          // Our own instance (src/app/queryClient.ts): it carries the retry rules and the auth-query refetch rules.
          reactQuery: { clientConfig: queryClient },
        }}
      >
        {children}
        <UnsavedChangesNotifier />
        <Toaster />
      </Refine>
    </PreferencesProvider>
  );
}

export function App() {
  return (
    <AppErrorBoundary fullPage>
      <BrowserRouter>
        <AppProviders>
          <AppRoutes />
        </AppProviders>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
