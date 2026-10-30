// ContentPageDialog: "New page" and "Edit page" (`POST` and `PATCH /admin/content-pages`) for landing pages, static pages and blog
// posts. The demo had no editor (its pages were seed rows); the map adds the routes. The body is plain Markdown in a textarea (no
// rich-text editor). A new page is a draft; publishing is its own step. Only what changed is sent on an edit.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextareaField, TextField, toast } from '@/components/ui';
import { useCreatePage, useUpdatePage } from '../hooks/usePageMutations';
import { kindLabel, LOCALE_OPTIONS } from '../lib/kinds';
import type { ContentPage, PageKind, UpdatePageBody } from '../types';

type Values = {
  kind: PageKind;
  locale: string;
  title: string;
  slug: string;
  bodyMd: string;
  seoTitle: string;
  seoDescription: string;
};

export interface ContentPageDialogProps {
  /** The page to edit; leave out to create one. */
  page?: ContentPage;
  /** The kinds a new page may have (the landing kinds on the Landing pages tab, page and blog post on the Content tab). */
  kinds: readonly PageKind[];
  onClose: () => void;
}

/** The text fields an edit compares one by one. */
const TEXT_FIELDS = ['locale', 'title', 'slug', 'bodyMd', 'seoTitle', 'seoDescription'] as const;

/** Creates a page, or edits the one it is given. */
export function ContentPageDialog({ page, kinds, onClose }: ContentPageDialogProps) {
  const create = useCreatePage();
  const update = useUpdatePage();
  const form = useForm<Values>({
    defaultValues: {
      kind: page?.kind ?? kinds[0],
      locale: page?.locale ?? 'en',
      title: page?.title ?? '',
      slug: page?.slug ?? '',
      bodyMd: page?.bodyMd ?? '',
      seoTitle: page?.seoTitle ?? '',
      seoDescription: page?.seoDescription ?? '',
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!page) {
        const slug = values.slug.trim();
        await create.mutateAsync({
          kind: values.kind,
          locale: values.locale,
          title: values.title.trim(),
          ...(slug ? { slug } : {}),
          bodyMd: values.bodyMd,
          ...(values.seoTitle.trim() ? { seoTitle: values.seoTitle.trim() } : {}),
          ...(values.seoDescription.trim() ? { seoDescription: values.seoDescription.trim() } : {}),
        });
        return;
      }
      const body: UpdatePageBody = {};
      for (const field of TEXT_FIELDS) {
        // The Markdown is kept as typed; the short fields lose stray spaces at the ends.
        const next = field === 'bodyMd' ? values[field] : values[field].trim();
        if (next !== page[field]) body[field] = next;
      }
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ page, body });
    },
    { fields: ['kind', ...TEXT_FIELDS] },
  );

  return (
    <FormDialog
      open
      size="lg"
      title={page ? `Edit ${page.title}` : 'New page'}
      sub={page ? undefined : 'It is saved as a draft. Publish it from the page list when it is ready.'}
      confirm={page ? 'Save changes' : 'Save draft'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Type"
            selectWrapClassName="w-full"
            disabled={Boolean(page)}
            options={kinds.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
            error={errors.kind}
            {...register('kind')}
          />
          <SelectField
            label="Language"
            selectWrapClassName="w-full"
            options={LOCALE_OPTIONS}
            error={errors.locale}
            {...register('locale')}
          />
        </div>
        <TextField
          label="Title"
          autoComplete="off"
          maxLength={160}
          autoFocus
          error={errors.title}
          {...register('title', { validate: (value) => value.trim() !== '' || 'Enter a title.' })}
        />
        <TextField
          label="Slug"
          className="mono"
          autoComplete="off"
          spellCheck={false}
          hint={page ? undefined : 'Leave empty and the server makes it from the title.'}
          error={errors.slug}
          {...register('slug')}
        />
        <TextareaField
          label="Text (Markdown)"
          className="mono"
          rows={10}
          spellCheck={false}
          error={errors.bodyMd}
          {...register('bodyMd')}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Search title"
            autoComplete="off"
            hint="What Google shows as the headline."
            error={errors.seoTitle}
            {...register('seoTitle')}
          />
          <TextField
            label="Search description"
            autoComplete="off"
            hint="The line under the headline."
            error={errors.seoDescription}
            {...register('seoDescription')}
          />
        </div>
      </div>
    </FormDialog>
  );
}
