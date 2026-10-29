// The route table: the sign-in screens (public) and every page inside the shell (protected), each behind its permission gate.
import { Authenticated } from '@refinedev/core';
import type { ComponentType } from 'react';
import { Outlet, Route, Routes } from 'react-router';
import { AUTH_PATHS, LoginPage, SetPasswordPage, SetupTwoFactorPage, TwoFactorPage } from '@/features/auth';
import { AppLoading } from './gates/AppLoading';
import { HomeRedirect } from './gates/HomeRedirect';
import { PageRoute } from './gates/PageRoute';
import { PublicArea } from './gates/PublicArea';
import { RedirectWhenSignedIn } from './gates/RedirectWhenSignedIn';
import { SignInRedirect } from './gates/SignInRedirect';
import { AppShell } from './layout/AppShell';
import { lazyPage } from './lazyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { resources, toPageResource, type PageResource } from './resources';

/**
 * Real pages by resource name. A page missing here shows the "being ported" placeholder, so a feature replaces its
 * placeholder by adding its lazily loaded page here (see `lazyPage`):
 *   `orders: lazyPage(() => import('@/features/orders/pages'), 'OrdersPage')`
 */
const PAGES: Partial<Record<string, ComponentType>> = {
  access: lazyPage(() => import('@/features/access/pages'), 'AccessPage'),
};

/** The same for detail views (`/merchants/:id`, `/customers/:id`): `merchants: lazyPage(…, 'MerchantPage')`. */
const DETAIL_PAGES: Partial<Record<string, ComponentType>> = {};

const PAGE_RESOURCES = resources
  .map(toPageResource)
  .filter((page): page is PageResource => page !== undefined);

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <Authenticated key="console" fallback={<SignInRedirect />} loading={<AppLoading />}>
            <AppShell>
              <Outlet />
            </AppShell>
          </Authenticated>
        }
      >
        <Route index element={<HomeRedirect />} />
        {PAGE_RESOURCES.map((page) => (
          <Route
            key={page.name}
            path={page.path}
            element={<PageRoute page={page} action="list" Page={PAGES[page.name]} />}
          />
        ))}
        {PAGE_RESOURCES.filter((page) => page.detailPath).map((page) => (
          <Route
            key={`${page.name}/detail`}
            path={page.detailPath}
            element={<PageRoute page={page} action="show" Page={DETAIL_PAGES[page.name]} />}
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        element={
          <Authenticated key="sign-in" fallback={<PublicArea />} loading={<AppLoading />}>
            <RedirectWhenSignedIn />
          </Authenticated>
        }
      >
        <Route path={AUTH_PATHS.login} element={<LoginPage />} />
        <Route path={AUTH_PATHS.twoFactor} element={<TwoFactorPage />} />
        <Route path={AUTH_PATHS.setupTwoFactor} element={<SetupTwoFactorPage />} />
        <Route path={AUTH_PATHS.setPassword} element={<SetPasswordPage />} />
      </Route>
    </Routes>
  );
}
