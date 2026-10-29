// BulkReplyDialog: paste IMEI + CODE lines, see which open order each one matches, then apply (`POST /admin/orders/bulk-reply/*`).
// The demo has no such flow; it is built in the demo's dialog style (feature brief). Step one is the text, step two the
// preview table; nothing changes until the second confirm.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  DataTable,
  dialogSubmit,
  FormDialog,
  TextareaField,
  toast,
  type BadgeTone,
  type DataTableColumn,
} from '@/components/ui';
import { useApplyBulkReply, usePreviewBulkReply } from '../hooks/useBulkReply';
import { ordersText, type BulkSummary } from '../lib/bulk';
import type { BulkReplyLine, BulkReplyLineStatus } from '../types';

type Values = { text: string };

// How each line was read, in words and tone. Only a matched line will be sent.
const LINE_STATUS: Record<BulkReplyLineStatus, { label: string; tone: BadgeTone }> = {
  matched: { label: 'Will complete', tone: 'good' },
  not_found: { label: 'No order found', tone: 'warn' },
  ambiguous: { label: 'Several open orders', tone: 'warn' },
  invalid: { label: 'Not a valid line', tone: 'warn' },
  not_open: { label: 'Already closed', tone: 'neutral' },
};

const COLUMNS: DataTableColumn<BulkReplyLine>[] = [
  { key: 'line', label: 'Line', num: true, render: (line) => line.line },
  { key: 'imei', label: 'IMEI / input', render: (line) => <span className="mono">{line.imei ?? '–'}</span> },
  { key: 'code', label: 'Code', render: (line) => <span className="mono">{line.code ?? '–'}</span> },
  {
    key: 'order',
    label: 'Order',
    render: (line) => (line.orderId === null ? '–' : <span className="mono">#{line.orderId}</span>),
  },
  {
    key: 'status',
    label: 'Result',
    render: (line) => (
      <Badge tone={LINE_STATUS[line.status].tone} icon={line.status === 'matched' ? 'check' : 'alert'}>
        {LINE_STATUS[line.status].label}
      </Badge>
    ),
  },
];

export interface BulkReplyDialogProps {
  onClose: () => void;
  /** Called after the replies were applied, for the page to show failures. */
  onDone: (summary: BulkSummary) => void;
}

export function BulkReplyDialog({ onClose, onDone }: BulkReplyDialogProps) {
  const preview = usePreviewBulkReply();
  const apply = useApplyBulkReply();
  const [lines, setLines] = useState<BulkReplyLine[] | null>(null);
  const form = useForm<Values>({ defaultValues: { text: '' } });
  const {
    register,
    formState: { errors },
  } = form;
  const matched = (lines ?? []).filter(
    (line) => line.status === 'matched' && line.orderId !== null && line.code,
  );

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!lines) {
        const result = await preview.mutateAsync({ text: values.text });
        setLines(result.lines);
        return false;
      }
      if (matched.length === 0) return 'No line matches an open order, so there is nothing to apply.';
      const result = await apply.mutateAsync({
        items: matched.map((line) => ({ orderId: line.orderId as number, code: line.code as string })),
      });
      toast(
        result.applied > 0
          ? {
              kind: 'success',
              title: `${ordersText(result.applied)} completed`,
              body: 'The replies were sent and the money settled.',
            }
          : { kind: 'error', title: 'No order was completed', body: result.failed[0]?.title },
      );
      onDone({
        verb: 'completed',
        done: result.applied,
        total: matched.length,
        failed: result.failed.map((item) => ({ label: `#${item.orderId}`, reason: item.title })),
      });
    },
    { fields: ['text'] },
  );

  return (
    <FormDialog
      open
      size="lg"
      title="Bulk reply"
      sub={
        lines
          ? `${matched.length} of ${lines.length} ${lines.length === 1 ? 'line matches' : 'lines match'} an open order. Check them, then apply.`
          : 'Paste the replies you got from a supplier: one order per line, the IMEI or input first and then the code.'
      }
      confirm={lines ? `Apply ${matched.length} ${matched.length === 1 ? 'reply' : 'replies'}` : 'Preview'}
      onClose={onClose}
      onSubmit={submit}
    >
      {lines ? (
        <div className="space-y-3">
          <DataTable caption="Pasted lines" columns={COLUMNS} rows={lines} rowKey={(line) => line.line} />
          <Button size="sm" onClick={() => setLines(null)}>
            Back to the text
          </Button>
        </div>
      ) : (
        <TextareaField
          label="IMEI and code, one order per line"
          rows={8}
          className="mono"
          placeholder={'356938035643809 UNLOCK-8841\n354019112345678 UNLOCK-8842'}
          hint="Separate the two with a space, a comma or a tab."
          spellCheck={false}
          error={errors.text}
          {...register('text', { validate: (value) => value.trim() !== '' || 'Paste at least one line.' })}
        />
      )}
    </FormDialog>
  );
}
