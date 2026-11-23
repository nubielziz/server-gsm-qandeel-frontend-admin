// CatalogViewHeader: the Catalog page's header outside its table view (the settings, the publish runs, the loading and empty states):
// the page title, the name of the view, and links to the other views the role may use: back to the services table, the Catalog
// settings from the publish runs, and the publish runs from the settings.
import { ButtonLink, Icon, PageHeader } from '@/components/ui';
import { catalogPath } from '../../lib/paths';
import { CATALOG_HEADING, type ViewAccess } from '../../lib/tabs';

export interface CatalogViewHeaderProps {
  /** The view's name under the title, such as "Catalog settings". */
  sub?: string;
  /** The view on screen; the header links to the others. */
  current?: 'settings' | 'publish';
  /** The views the role may use; undefined while its permissions load (no links then). */
  access?: ViewAccess;
}

/** The title row of a view that is not the table. A view the role may not use gets no link. */
export function CatalogViewHeader({ sub, current, access }: CatalogViewHeaderProps) {
  const toSettings = current === 'publish' && access?.settings;
  const toPublish = current === 'settings' && access?.publish;
  const links = access?.table || toSettings || toPublish;
  return (
    <PageHeader
      title={CATALOG_HEADING}
      sub={sub}
      actions={
        links ? (
          <>
            {toSettings && (
              <ButtonLink to={catalogPath({ view: 'settings' })}>
                <Icon name="sliders" className="ic-sm" />
                Catalog settings
              </ButtonLink>
            )}
            {toPublish && (
              <ButtonLink to={catalogPath({ view: 'publish' })}>
                <Icon name="store" className="ic-sm" />
                Publish runs
              </ButtonLink>
            )}
            {access?.table && (
              <ButtonLink to={catalogPath()}>
                <Icon name="chevL" className="ic-sm" />
                Back to the table
              </ButtonLink>
            )}
          </>
        ) : undefined
      }
    />
  );
}
