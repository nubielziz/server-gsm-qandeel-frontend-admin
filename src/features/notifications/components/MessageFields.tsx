// MessageFields: section 4 of the composer: the message. English and Arabic tabs (Arabic is optional: when it is empty, readers of Arabic get the English text),
// a title and a body with a character counter, a hint for `{{name}}`, and a link field for each kind of person the audience reaches. Arabic fields are
// right-to-left (`dir="rtl"`, `lang="ar"`).
import { useState } from 'react';
import { TextareaField, TextField, Tabs } from '@/components/ui';
import { BODY_MAX, targetedTypes, TITLE_MAX, type ComposerForm, type Problems } from '../lib/spec';
import type { CampaignLocale, PersonType } from '../types';

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
  client: { key: 'merchant', label: 'Link for merchants', placeholder: '/orders' },
  customer: { key: 'customer', label: 'Link for customers', placeholder: '/account/orders' },
};

export function MessageFields({ form, onChange, errors }: MessageFieldsProps) {
  const [locale, setLocale] = useState<CampaignLocale>('en');
  const text = form[locale];
  const arabic = locale === 'ar';
  const set = (patch: Partial<typeof text>) => onChange({ [locale]: { ...text, ...patch } });
  // A message about the language that is not on screen is shown above the tabs' fields, so a refusal is never hidden on another tab.
  const other: CampaignLocale = arabic ? 'en' : 'ar';
  const hidden = [
    errors[`content.${other}.title`],
    errors[`content.${other}.body`],
    other === 'ar' ? errors['content.ar'] : undefined,
  ].filter(Boolean);
  const shown = (field: 'title' | 'body') =>
    errors[`content.${locale}.${field}`] ?? (arabic && field === 'title' ? errors['content.ar'] : undefined);

  return (
    <section aria-label="Message" className="space-y-3">
      <h3 className="text-sm font-semibold">4. Message</h3>
      <Tabs
        label="Language of the message"
        items={[
          { value: 'en', label: 'English' },
          { value: 'ar', label: 'العربية' },
        ]}
        value={locale}
        onChange={setLocale}
      />
      {hidden.length > 0 && (
        <p className="text-xs text-crit-fg" role="alert">
          {other === 'ar' ? 'Arabic' : 'English'}: {hidden.join(' ')}
        </p>
      )}
      {arabic && (
        <p className="text-xs text-ink3">
          Arabic is optional. When it is empty, people who read Arabic get the English text.
        </p>
      )}
      <TextField
        label={arabic ? 'العنوان' : 'Title'}
        value={text.title}
        maxLength={TITLE_MAX}
        error={shown('title')}
        {...(arabic ? { dir: 'rtl', lang: 'ar' } : { lang: 'en' })}
        onChange={(event) => set({ title: event.target.value })}
      />
      <TextareaField
        label={arabic ? 'النص' : 'Text'}
        rows={7}
        value={text.body}
        maxLength={BODY_MAX}
        error={shown('body')}
        hint={
          <>
            Plain text. Write <code className="mono">{'{{name}}'}</code> to greet the person by name.{' '}
            <span className="tabular-nums">
              {text.body.length} / {BODY_MAX}
            </span>
          </>
        }
        {...(arabic ? { dir: 'rtl', lang: 'ar' } : { lang: 'en' })}
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
