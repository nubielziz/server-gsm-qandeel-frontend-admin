// useCanOpenPage: whether the signed-in staff member may open a console page, so a link to it (a dashboard button, a
// "see the rule" link) is only offered when it leads somewhere. A hint only: the page checks again, and so does the server.
import { useCan, useResourceParams } from '@refinedev/core';

/**
 * `true` or `false` once the access-control provider has answered for the page resource `name` (`orders`,
 * `suppliers`), `undefined` while it is still checking. Asks the same question as the page's own gate (PageRoute).
 */
export function useCanOpenPage(name: string): boolean | undefined {
  const { resource } = useResourceParams({ resource: name });
  const { data } = useCan({ resource: name, action: 'list', params: { resource } });
  return data?.can;
}
