// CheckDrawer: the details of one IMEI check in the 580px side sheet, opened from a row (`?check=<id>`). The demo's table had
// no details; the map has `GET /admin/imei-checks/:id`, so the drawer shows everything the server keeps about the lookup: the
// IMEI as stored (digits, or a hash after the retention period), the result, where it came from, the cost and what it returned.
import { Link } from 'react-router';
import { CopyButton, Drawer, ErrorState, KeyValue, SkeletonTable, TypeTag } from '@/components/ui';
import { ago, fmtDate, fmtImei, money, useNow } from '@/lib/format';
import { useImeiCheck } from '../hooks/useImeiChecks';
import { CHECK_KIND_LABEL, CHECK_SOURCE_LABEL, labelOf } from '../lib/labels';
import type { ImeiCheck } from '../types';
import { CheckResultBadge } from './CheckResultBadge';
import { CheckResultList } from './CheckResultList';
import { OrderLink } from './OrderLink';

function CheckFacts({ check, now }: { check: ImeiCheck; now: number }) {
  return (
    <KeyValue
      className="mb-5"
      rows={[
        [
          'IMEI',
          <>
            <span className="mono">{fmtImei(check.imei)}</span> <CopyButton value={check.imei} label="IMEI" />
          </>,
        ],
        ['Device', `${check.brand} ${check.model}`.trim() || '–'],
        ['Check', <TypeTag key="kind">{labelOf(CHECK_KIND_LABEL, check.checkType)}</TypeTag>],
        ['Result', <CheckResultBadge key="status" status={check.status} />],
        ['From', labelOf(CHECK_SOURCE_LABEL, check.source)],
        check.country ? ['Country', check.country] : null,
        check.ip
          ? [
              'Address',
              <span key="ip" className="mono">
                {check.ip}
              </span>,
            ]
          : null,
        ['When', `${fmtDate(check.createdAt)} · ${ago(check.createdAt, now)}`],
        check.cachedUntil ? ['Cached until', fmtDate(check.cachedUntil)] : null,
        check.orderId !== null ? ['Order', <OrderLink key="order" id={check.orderId} />] : null,
        check.customer
          ? [
              'Customer',
              <Link key="customer" className="link" to={`/customers/${check.customer.id}`}>
                {check.customer.name}
              </Link>,
            ]
          : null,
        check.supplier ? ['Supplier', check.supplier.name] : null,
        ['Lookup cost', money(check.cost, 2)],
        ['Charged', money(check.price, 2)],
      ]}
    />
  );
}

export interface CheckDrawerProps {
  id: number;
  /** The row from the table, shown at once while the single read loads. */
  row?: ImeiCheck;
  onClose: () => void;
}

export function CheckDrawer({ id, row, onClose }: CheckDrawerProps) {
  const now = useNow();
  const { check, query } = useImeiCheck(id, row);

  if (!check) {
    return (
      <Drawer open onClose={onClose} title={`IMEI check ${id}`}>
        {query.isError ? (
          <ErrorState
            title="Could not load this check"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <SkeletonTable cols={2} rows={6} />
        )}
      </Drawer>
    );
  }
  return (
    <Drawer
      open
      onClose={onClose}
      title="IMEI check"
      badges={<CheckResultBadge status={check.status} />}
      sub={`${labelOf(CHECK_KIND_LABEL, check.checkType)} · ${fmtDate(check.createdAt)}`}
    >
      <CheckFacts check={check} now={now} />
      <CheckResultList result={check.result} />
    </Drawer>
  );
}
