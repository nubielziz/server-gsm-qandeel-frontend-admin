// ComposerFiles: the Attach button and the chips of the files on the message being written (feature 28, rule 8). Files upload as soon as they are picked; each
// chip says whether its file is uploading, ready or refused (with the reason), and can be removed. PDF, JPEG or PNG, 5 MiB, 5 files per message.
import { useRef } from 'react';
import { Button, Icon } from '@/components/ui';
import type { Chip } from '../hooks/useAttachments';
import { ATTACHMENT_ACCEPT, formatFileSize, MAX_ATTACHMENTS } from '../lib/attachments';

export interface ComposerFilesProps {
  chips: readonly Chip[];
  onPick: (files: readonly File[]) => void;
  onRemove: (key: number) => void;
  /** The box is locked (a missing permission): nothing can be attached. */
  disabled: boolean;
}

function ChipView({ chip, onRemove }: { chip: Chip; onRemove: (key: number) => void }) {
  const failed = chip.state === 'error';
  return (
    <li
      className={
        failed
          ? 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-crit-dot bg-crit-bg px-2 py-1 text-xs text-crit-fg'
          : 'inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs'
      }
    >
      <Icon
        name={chip.state === 'uploading' ? 'loader' : 'paperclip'}
        className={chip.state === 'uploading' ? 'ic-xs animate-spin' : 'ic-xs'}
      />
      <span className="truncate font-medium">{chip.name}</span>
      <span className="flex-none text-ink3">{formatFileSize(chip.size)}</span>
      {chip.state === 'uploading' && <span className="flex-none text-ink3">Uploading…</span>}
      {failed && <span role="alert">{chip.problem}</span>}
      <button
        type="button"
        className="flex-none rounded p-0.5 hover:bg-hover"
        aria-label={`Remove ${chip.name}`}
        onClick={() => onRemove(chip.key)}
      >
        <Icon name="x" className="ic-xs" />
      </button>
    </li>
  );
}

export function ComposerFiles({ chips, onPick, onRemove, disabled }: ComposerFilesProps) {
  const input = useRef<HTMLInputElement>(null);
  const full = chips.filter((chip) => chip.state !== 'error').length >= MAX_ATTACHMENTS;
  return (
    <>
      <Button
        size="sm"
        disabled={disabled}
        title={
          full ? `A message can have ${MAX_ATTACHMENTS} files at most.` : 'PDF, JPEG or PNG, up to 5 MB each'
        }
        onClick={() => input.current?.click()}
      >
        <Icon name="paperclip" className="ic-sm" />
        Attach
      </Button>
      <input
        ref={input}
        hidden
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        aria-label="Attach files"
        onChange={(event) => {
          onPick([...(event.target.files ?? [])]);
          // The same file can be picked again after it was removed.
          event.target.value = '';
        }}
      />
      {chips.length > 0 && (
        <ul className="m-0 flex w-full list-none flex-wrap gap-1.5 p-0" aria-label="Files on this message">
          {chips.map((chip) => (
            <ChipView key={chip.key} chip={chip} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </>
  );
}
