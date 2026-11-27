// Public surface of the shared UI kit: React ports of the demo's helpers in 20-ui.js and 13-b2c-ui.js.
// Features import from '@/components/ui'; the helper modules behind these files are internal.

// Basics
export * from './Icon';
export * from './Button';
export * from './ButtonLink';
export * from './Badge';
export * from './StatusDot';
export * from './TypeTag';
export * from './Count';
export * from './Kbd';
export * from './Avatar';
export * from './BrandMark';
export * from './CopyButton';
export { cx } from './cx';
export { initials } from './initials';

// Layout and content
export * from './Panel';
export * from './PageHeader';
export * from './KeyValue';
export * from './StatGrid';
export * from './InfoTip';
export * from './Timeline';
export * from './Meter';
export * from './ScoreMeter';

// Navigation and controls
export * from './Tabs';
export * from './SectionTabs';
export * from './SegmentedControl';
export * from './Switch';
export * from './YesNo';
export * from './StripTabs';
export * from './ViewLinks';
export * from './LegendBox';
export * from './PartsLayout';
export * from './StatusSquare';
export * from './SearchInput';
export * from './QuickSearchText';
export * from './RefreshTool';
export * from './TableToolbar';

// Form fields and dialogs
export * from './TextField';
export * from './TextareaField';
export * from './SelectField';
export * from './CheckboxField';
export * from './FormRow';
export * from './SectionHeading';
export * from './MoreOptions';
export * from './IndeterminateCheckbox';
export * from './RadioGroup';
export type { FieldErrorLike } from './fieldA11y';
export * from './Modal';
export * from './FormDialog';
export * from './ConfirmDialog';
export * from './BulkSummaryDialog';
export * from './Drawer';
export * from './FormSection';
export * from './SectionForm';
export * from './PartForm';
export * from './SaveBar';
export * from './SaveNote';
export * from './ReadValue';
export * from './ReadField';
export { outcomeOf, SAVED_MS, useSaveFlow } from './useSaveFlow';
export type { SaveOutcome } from './useSaveFlow';
export { useDirtySections, useReportDirty } from './useReportDirty';
export type { ReportSection } from './useReportDirty';
export { useDirtyMark } from './useDirtyMark';
export type { DirtyMark } from './useDirtyMark';
export * from './UnsavedGuard';
export { isPlainClick, leaveLink } from './leaveLink';
export type { HereAddress } from './leaveLink';
export * from './Menu';
export * from './FloatingPanel';
export * from './CommandPalette';
export { usePopover } from './usePopover';
export { submitUnlessInvalid } from './formSubmit';

// Feedback and states
export * from './Toaster';
export { toast, dismiss, clearToasts, subscribe, getToasts } from './toast';
export type { ToastAction, ToastInput, ToastItem, ToastKind } from './toast';
export { copyText } from './copyText';
export * from './EmptyState';
export * from './ErrorState';
export * from './Skeleton';
export * from './SkeletonTable';
export * from './SkeletonStat';
export * from './QueryState';
export { errorText } from './errorText';
export type { ErrorLike } from './errorText';

// Tables
export * from './DataTable';
export * from './Pager';
export * from './FooterPager';
export * from './PinnedBar';
export * from './WithSelected';
export { usePageClamp } from './usePageClamp';
export { SEARCH_PAUSE_MS, useDebouncedCommit } from './useDebouncedCommit';
export type { PageClampArgs } from './usePageClamp';
export { useRowSelection } from './useRowSelection';
export type { RowSelection } from './useRowSelection';
export type {
  DataTableColumn,
  HideBelow,
  PaginationState,
  RowKey,
  SortOrder,
  SortState,
} from './dataTableTypes';
export * from './dialogSubmit';
