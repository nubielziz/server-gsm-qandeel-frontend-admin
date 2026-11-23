// CategoryMenu: "Set category" of the Catalog selection bar: a button with a menu of the categories; picking one moves every ticked
// service there (one call per service; the server refuses a service whose type the category does not take).
import { Button, Icon, Menu, usePopover } from '@/components/ui';
import type { ServiceCategory } from '../../types';

export interface CategoryMenuProps {
  categories: readonly ServiceCategory[];
  lock: { disabled: boolean; title?: string };
  onPick: (category: ServiceCategory) => void;
}

/** The trigger and its menu; disabled with the reason when the role may not change services or no category is loaded. */
export function CategoryMenu({ categories, lock, onPick }: CategoryMenuProps) {
  const pop = usePopover();
  return (
    <>
      <Button
        ref={pop.anchorRef}
        size="sm"
        disabled={lock.disabled || categories.length === 0}
        title={lock.title ?? (categories.length === 0 ? 'No category is loaded' : undefined)}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="tag" className="ic-sm" />
        Set category
        <Icon name="chevD" className="ic-xs" />
      </Button>
      <Menu
        {...pop.panelProps}
        align="start"
        width={240}
        label="Move to category"
        items={categories.map((category) => ({
          label: category.name,
          icon: 'tag' as const,
          run: () => onPick(category),
        }))}
      />
    </>
  );
}
