// InfoTip: the small (i) button that opens a note popover. Ports the 'note' action and openNote() of 20-ui.js.
import { FloatingPanel } from './FloatingPanel';
import { Icon } from './Icon';
import { usePopover } from './usePopover';

export interface InfoTipProps {
  /** Heading of the note; also names the button ("About {title}"). */
  title: string;
  note: string;
}

export function InfoTip({ title, note }: InfoTipProps) {
  const pop = usePopover();
  return (
    <>
      <button
        ref={pop.anchorRef}
        type="button"
        className="ms-1 inline-flex h-5 w-5 items-center justify-center rounded text-ink3 hover:text-ink"
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        aria-label={`About ${title}`}
        onClick={pop.toggle}
      >
        <Icon name="info" className="ic-xs" />
      </button>
      <FloatingPanel
        {...pop.panelProps}
        align="start"
        className="menu p-3 text-xs"
        role="dialog"
        aria-label={title}
        style={{ width: 264, maxWidth: 'calc(100vw - 16px)' }}
      >
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 text-ink2">{note}</p>
      </FloatingPanel>
    </>
  );
}
