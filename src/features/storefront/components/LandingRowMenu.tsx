// LandingRowMenu: the "⋯" menu of a landing page row. Ports `lp-menu` of 50-p-storefront.js: Publish and Unpublish (the publish route)
// and Edit…. "Hide from Google" and "Open the page" are not offered (the map only publishes or hides). A locked action is shown
// disabled, with the missing permission in the title.
import { Button, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import type { ContentPage } from '../types';

export interface LandingRowMenuProps {
  page: ContentPage;
  grants: StorefrontGrants;
  onEdit: (page: ContentPage) => void;
  onPublish: (page: ContentPage, published: boolean) => void;
}

/** The row's actions; the tab owns the dialog and the request they start. */
export function LandingRowMenu({ page, grants, onEdit, onPublish }: LandingRowMenuProps) {
  const pop = usePopover();
  const update = grants.needs('storefront:update');
  const publish = grants.needs('storefront:publish');

  const items: MenuItem[] = [
    { label: 'Edit…', icon: 'edit', disabled: update.disabled, title: update.title, run: () => onEdit(page) },
  ];
  if (page.status !== 'published') {
    items.push({
      label: 'Publish',
      icon: 'check',
      disabled: publish.disabled,
      title: publish.title,
      run: () => onPublish(page, true),
    });
  }
  if (page.status !== 'draft') {
    items.push({
      label: 'Unpublish',
      icon: 'x',
      disabled: publish.disabled,
      title: publish.title,
      run: () => onPublish(page, false),
    });
  }

  return (
    <>
      <Button
        ref={pop.anchorRef}
        variant="ghost"
        size="sm"
        icon
        aria-label={`Actions for ${page.title}`}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="more" className="ic-sm" />
      </Button>
      <Menu {...pop.panelProps} items={items} width={200} label={`Actions for ${page.title}`} />
    </>
  );
}
