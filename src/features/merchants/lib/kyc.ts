// The words and looks of verification (KYC) requests, and how an uploaded document is named. A screen the demo lacks (MISMATCHES M47).
import type { BadgeTone, IconName } from '@/components/ui';
import type { KycFile, KycSubmissionStatus } from '../types';
import type { KycFilter } from './filters';

export const KYC_BADGE: Readonly<
  Record<KycSubmissionStatus, { tone: BadgeTone; icon: IconName; label: string }>
> = {
  pending: { tone: 'warn', icon: 'clock', label: 'Pending' },
  approved: { tone: 'good', icon: 'checkCircle', label: 'Approved' },
  rejected: { tone: 'crit', icon: 'xCircle', label: 'Rejected' },
};

export const KYC_FILTER_LABEL: Readonly<Record<KycFilter, string>> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All requests',
};

/** A file size the way people read it: "240 kB", "1.4 MB". */
export function fileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** The documents of a request: the named files when the server joined them, else "Document 1", "Document 2"… by id. */
export function documentsOf(submission: { fileIds: readonly number[]; files?: readonly KycFile[] }): {
  id: number;
  label: string;
  size?: string;
}[] {
  return submission.fileIds.map((id, index) => {
    const file = submission.files?.find((candidate) => candidate.id === id);
    return {
      id,
      label: file?.filename ?? `Document ${index + 1}`,
      size: file ? fileSize(file.size) : undefined,
    };
  });
}
