// The name of the open record ("Acme Ltd" on a merchant page), shown as the last breadcrumb and in the tab title.
// Detail pages set it with useBreadcrumbTitle(name); the shell provides the store and reads it. Replaces the
// merchant/customer name lookups in renderTopbar and render() of 90-app.js.
import { createContext, useContext, useEffect } from 'react';

export type BreadcrumbTitle = {
  /** The record's name, or undefined on list pages and while it loads. */
  title: string | undefined;
  setTitle(title: string | undefined): void;
};

// Outside the shell (a page rendered alone in a test) the default store does nothing.
export const BreadcrumbTitleContext = createContext<BreadcrumbTitle>({
  title: undefined,
  setTitle: () => {},
});

/** The record name the shell shows, for the breadcrumb and the document title. */
export function useCurrentBreadcrumbTitle(): string | undefined {
  return useContext(BreadcrumbTitleContext).title;
}

/**
 * Call it from a detail page with the record's name (undefined while it loads). The name is cleared again when
 * the page unmounts, so the next page starts with a plain breadcrumb.
 */
export function useBreadcrumbTitle(name: string | undefined): void {
  const { setTitle } = useContext(BreadcrumbTitleContext);
  useEffect(() => {
    setTitle(name);
    return () => setTitle(undefined);
  }, [name, setTitle]);
}
