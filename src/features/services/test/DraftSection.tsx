// A panel section for tests: one text box that reports itself dirty while it holds text, so the unsaved-changes guard of the service
// panel can be tried without a real form. Import it from tests only (the guard tests put it in the section list).
import { useState } from 'react';
import type { PanelSectionProps } from '../components/panel/types';

/** A text box named "Note for <service>"; typing reports unsaved changes, clearing it reports none. */
export function DraftSection({ service, onDirtyChange }: PanelSectionProps) {
  const [text, setText] = useState('');
  return (
    <label className="block text-sm">
      Note for {service.name}
      <input
        className="input mt-1"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onDirtyChange(event.target.value !== '');
        }}
      />
    </label>
  );
}
