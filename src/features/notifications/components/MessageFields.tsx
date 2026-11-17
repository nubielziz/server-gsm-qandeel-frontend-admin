// MessageFields: section 4 of the composer: the message. A title and a body with a character counter, a hint for `{{name}}`, and a link field for each
// kind of person the audience reaches.
import { TextareaField, TextField } from '@/components/ui';
import { BODY_MAX, targetedTypes, TITLE_MAX, type ComposerForm, type Problems } from '../lib/spec';
import type { PersonType } from '../types';

export interface MessageFieldsProps {
  form: ComposerForm;
  onChange: (patch: Partial<ComposerForm>) => void;
  errors: Problems;
}

const LINKS: Record<
  PersonType,
  { key: 'staff' | 'merchant' | 'customer'; label: string; placeholder: string }
> = {
  staff: { key: 'staff', label: 'Link for staff', placeholder: '/orders' },
  // A merchant link must be a page of the merchant portal: the server refuses anything outside /merchant.
  client: { key: 'merchant', label: 'Link for merchants', placeholder: '/merchant/orders' },
  customer: { key: 'customer', label: 'Link for customers', placeholder: '/account/orders' },
};

export function MessageFields({ form, onChange, errors }: MessageFieldsProps) {
  const text = form.content;
  const set = (patch: Partial<typeof text>) => onChange({ content: { ...text, ...patch } });

  return (
    <section aria-label="Message" className="space-y-3">
      <h3 className="text-sm font-semibold">4. Message</h3>
      <TextField
        label="Title"
        value={text.title}
        maxLength={TITLE_MAX}
        error={errors['content.title']}
        onChange={(event) => set({ title: event.target.value })}
      />
      <TextareaField
        label="Text"
        rows={7}
        value={text.body}
        maxLength={BODY_MAX}
        error={errors['content.body']}
        hint={
          <>
            Plain text. Write <code className="mono">{'{{name}}'}</code> to greet the person by name.{' '}
            <span className="tabular-nums">
              {text.body.length} / {BODY_MAX}
            </span>
          </>
        }
        onChange={(event) => set({ body: event.target.value })}
      />
      {targetedTypes(form.audience).length > 0 && (
        <fieldset className="space-y-3 border-t border-line pt-3">
          <legend className="label">Where a click goes (optional)</legend>
          {targetedTypes(form.audience).map((type) => {
            const link = LINKS[type];
            return (
              <TextField
                key={type}
                label={link.label}
                placeholder={link.placeholder}
                hint="A path on the site that starts with one /, no address."
                value={form.link[link.key]}
                error={errors[`link.${link.key}`]}
                onChange={(event) => onChange({ link: { ...form.link, [link.key]: event.target.value } })}
              />
            );
          })}
        </fieldset>
      )}
    </section>
  );
}
