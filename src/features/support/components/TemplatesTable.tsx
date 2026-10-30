// TemplatesTable: the reply templates as a table: title, category, language, shortcut and the start of the text, with Edit and Delete
// on each row. New in the console (the demo had no list of its macros outside the reply box). It draws what it is given; the
// view owns the data and the dialogs. Without the permission a button is disabled and its title names it.
import type { ReactNode } from 'react';
import { Button, DataTable, Icon, type DataTableColumn } from '@/components/ui';
import type { SupportGrants } from '../hooks/useSupportGrants';
import { CATEGORY_LABEL, LOCALE_OPTIONS } from '../lib/status';
import type { ReplyTemplate } from '../types';

export interface TemplatesTableProps {
  rows: readonly ReplyTemplate[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  grants: SupportGrants;
  onEdit: (template: ReplyTemplate) => void;
  onDelete: (template: ReplyTemplate) => void;
  empty: ReactNode;
}

const localeLabel = (locale: string) =>
  LOCALE_OPTIONS.find((option) => option.value === locale)?.label ?? locale;

export function TemplatesTable({
  rows,
  state,
  error,
  onRetry,
  grants,
  onEdit,
  onDelete,
  empty,
}: TemplatesTableProps) {
  const editLock = grants.needs('support:update');
  const deleteLock = grants.needs('support:delete');
  const columns: DataTableColumn<ReplyTemplate>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (template) => <span className="font-medium">{template.title}</span>,
    },
    { key: 'category', label: 'Category', render: (template) => CATEGORY_LABEL[template.category] },
    { key: 'locale', label: 'Language', hide: 'sm', render: (template) => localeLabel(template.locale) },
    {
      key: 'shortcut',
      label: 'Shortcut',
      hide: 'md',
      render: (template) =>
        template.shortcut ? (
          <span className="mono">{template.shortcut}</span>
        ) : (
          <span className="text-ink3">–</span>
        ),
    },
    {
      key: 'body',
      label: 'Text',
      hide: 'lg',
      className: 'max-w-[320px]',
      render: (template) => <span className="block truncate text-ink2">{template.body}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (template) => (
        <span className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon
            aria-label={`Edit ${template.title}`}
            disabled={editLock.disabled}
            title={editLock.title ?? 'Edit'}
            onClick={() => onEdit(template)}
          >
            <Icon name="edit" className="ic-sm" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon
            aria-label={`Delete ${template.title}`}
            disabled={deleteLock.disabled}
            title={deleteLock.title ?? 'Delete'}
            onClick={() => onDelete(template)}
          >
            <Icon name="x" className="ic-sm" />
          </Button>
        </span>
      ),
    },
  ];
  return (
    <DataTable
      caption="Reply templates"
      columns={columns}
      rows={rows}
      rowKey={(template) => template.id}
      state={state}
      error={error}
      errorTitle="Could not load the reply templates"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
