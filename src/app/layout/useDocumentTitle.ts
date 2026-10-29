// Sets the browser tab title to "<record> · <Page> · GSM Supply". Ports the document.title line of render() in 90-app.js.
import { useResourceParams } from '@refinedev/core';
import { useEffect } from 'react';
import { toPageResource } from '../resources';

export const APP_TITLE = 'GSM Supply';

/** Joins the parts that exist: record name, page name, app name. */
export function formatTitle(record: string | undefined, page: string | undefined): string {
  return [record, page, APP_TITLE].filter(Boolean).join(' · ');
}

/**
 * `record` is the open record's name (see useBreadcrumbTitle). With no page and no record (the sign-in redirect, a
 * moment during navigation) the title is left alone.
 */
export function useDocumentTitle(record: string | undefined): void {
  const { resource } = useResourceParams();
  const page = toPageResource(resource)?.meta.label;
  useEffect(() => {
    if (page || record) document.title = formatTitle(record, page);
  }, [page, record]);
}
