// The console pages (from the Refine resources) and the ones the signed-in staff member may open.
// The sidebar, the command palette and the "g then …" shortcuts all read this one list.
import { useCanWithoutCache, useResourceParams } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { toPageResource, type PageResource } from '../resources';

/** Every page resource, in the order they were declared. */
export function usePages(): PageResource[] {
  const { resources } = useResourceParams();
  return useMemo(
    () => resources.map(toPageResource).filter((page): page is PageResource => page !== undefined),
    [resources],
  );
}

/**
 * The pages the access-control provider lets the signed-in staff member open (the same `can` answer the page
 * gate uses). Undefined while it is being worked out, so the sidebar never flashes pages that then disappear.
 * The answer is cached per staff member and permission set, so every caller shares one computation.
 */
export function usePermittedPages(): PageResource[] | undefined {
  const { resources } = useResourceParams();
  const { can } = useCanWithoutCache();
  const pages = usePages();
  const { data: staff } = useMe();

  const { data: allowed } = useQuery({
    queryKey: ['app', 'permitted-pages', staff?.id, staff?.permissions],
    enabled: staff !== undefined,
    staleTime: Infinity,
    queryFn: async (): Promise<string[]> => {
      // No access-control provider means nothing is restricted.
      if (!can) return pages.map((page) => page.name);
      const answers = await Promise.all(
        pages.map((page) =>
          can({
            action: 'list',
            resource: page.name,
            params: { resource: resources.find((resource) => resource.name === page.name) },
          }),
        ),
      );
      return pages.filter((_page, index) => answers[index].can).map((page) => page.name);
    },
  });

  return useMemo(() => allowed && pages.filter((page) => allowed.includes(page.name)), [allowed, pages]);
}
