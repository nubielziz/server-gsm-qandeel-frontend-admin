// MacroPicker: the "Insert a reply template…" select above the composer. Ports the `tk-macro` select of threadView (49-p-support.js).
// Choosing a template fills the draft and the select goes back to its prompt, so the same template can be picked again.
import { SelectField } from '@/components/ui';
import type { ReplyTemplate } from '../types';

export interface MacroPickerProps {
  templates: readonly ReplyTemplate[];
  disabled?: boolean;
  onPick: (template: ReplyTemplate) => void;
}

export function MacroPicker({ templates, disabled = false, onPick }: MacroPickerProps) {
  return (
    <SelectField
      aria-label="Reply templates"
      value=""
      disabled={disabled || templates.length === 0}
      selectWrapClassName="min-w-[200px]"
      options={[
        { value: '', label: 'Insert a reply template…' },
        ...templates.map((template) => ({
          value: template.id,
          label: template.locale === 'en' ? template.title : `${template.title} (${template.locale})`,
        })),
      ]}
      onChange={(event) => {
        const picked = templates.find((template) => String(template.id) === event.target.value);
        if (picked) onPick(picked);
      }}
    />
  );
}
