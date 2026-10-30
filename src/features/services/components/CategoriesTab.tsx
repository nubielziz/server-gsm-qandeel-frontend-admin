// CategoriesTab: the "Categories" tab the map adds to the demo's page: the service categories with the merchant groups that see each
// one, New category, Edit and Delete. A category the services still use cannot be deleted; the dialog shows the server's message.
import { useState } from 'react';
import { Badge, Button, DataTable, EmptyState, Icon, TypeTag, type DataTableColumn } from '@/components/ui';
import { useCategories, useGroupOptions } from '../hooks/useChoices';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { visibleToText } from '../lib/categories';
import { TYPE_LABEL } from '../lib/status';
import type { ServiceCategory } from '../types';
import { CategoryDialog } from './CategoryDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; category: ServiceCategory };

/** The category list with its dialogs. */
export function CategoriesTab() {
  const grants = useServiceGrants();
  const { categories, query } = useCategories(grants.ready);
  const groups = useGroupOptions(grants.can('groups:read'));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('catalog:create');
  const updateLock = grants.needs('catalog:update');
  const deleteLock = grants.needs('catalog:delete');

  const newButton = (
    <Button
      variant="primary"
      size="sm"
      disabled={createLock.disabled}
      title={createLock.title}
      onClick={() => setDialog({ kind: 'create' })}
    >
      <Icon name="plus" className="ic-sm" />
      New category
    </Button>
  );

  const columns: DataTableColumn<ServiceCategory>[] = [
    {
      key: 'name',
      label: 'Category',
      render: (category) => (
        <span className={category.isActive ? 'font-medium' : 'font-medium text-ink3'}>{category.name}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      hide: 'sm',
      render: (category) => <TypeTag>{TYPE_LABEL[category.type]}</TypeTag>,
    },
    {
      key: 'visible',
      label: 'Visible to',
      render: (category) => (
        <span className="block max-w-[260px] truncate text-ink2">
          {visibleToText(category.allowedGroupIds, groups.data)}
        </span>
      ),
    },
    {
      key: 'services',
      label: 'Services',
      num: true,
      hide: 'md',
      render: (category) => category.serviceCount ?? '–',
    },
    {
      key: 'status',
      label: 'Status',
      render: (category) =>
        category.isActive ? (
          <Badge tone="good" icon="checkCircle">
            Shown
          </Badge>
        ) : (
          <Badge tone="neutral" icon="ban">
            Hidden
          </Badge>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (category) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            aria-label={`Edit ${category.name}`}
            disabled={updateLock.disabled}
            title={updateLock.title}
            onClick={() => setDialog({ kind: 'edit', category })}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            aria-label={`Delete ${category.name}`}
            disabled={deleteLock.disabled}
            title={deleteLock.title}
            onClick={() => setDialog({ kind: 'delete', category })}
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <p className="min-w-[13rem] flex-1 text-sm text-ink2">
          Categories group the services and decide which merchant groups can see them.
        </p>
        {newButton}
      </div>
      <div className="border-t border-line">
        <DataTable
          caption="Service categories"
          columns={columns}
          rows={categories}
          rowKey={(category) => category.id}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          errorTitle="Could not load the categories"
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState icon="layers" title="No categories yet" cta={newButton}>
              Create a category, then put services in it. Merchants browse the catalog by category.
            </EmptyState>
          }
        />
      </div>
      {dialog?.kind === 'create' && <CategoryDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && (
        <CategoryDialog category={dialog.category} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteCategoryDialog category={dialog.category} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
