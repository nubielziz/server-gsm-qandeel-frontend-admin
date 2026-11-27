// HelpDialog: "New article" and "Edit article" (`POST` and `PATCH /admin/help-articles`): a topic (a menu of the topics in use, or a new
// one), the question, the answer as Markdown in a textarea and whether it is published. The demo only toggled the status of seeded articles; the map
// adds the routes. Only what changed is sent on an edit.
import { useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, TextareaField, TextField, toast } from '@/components/ui';
import { useCreateArticle, useUpdateArticle } from '../hooks/useHelpMutations';
import { useHelpTopics } from '../hooks/useHelpTopics';
import type { HelpArticle, UpdateArticleBody } from '../types';
import { HelpTopicField, type HelpFormValues } from './HelpTopicField';

export interface HelpDialogProps {
  /** The article to edit; leave out to write one. */
  article?: HelpArticle;
  onClose: () => void;
}

/** Writes an article, or edits the one it is given. */
export function HelpDialog({ article, onClose }: HelpDialogProps) {
  const create = useCreateArticle();
  const update = useUpdateArticle();
  const { topics, loading } = useHelpTopics();
  const form = useForm<HelpFormValues>({
    defaultValues: {
      category: article?.category ?? '',
      question: article?.question ?? '',
      answerMd: article?.answerMd ?? '',
      isPublished: article?.isPublished ?? false,
    },
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = {
        category: values.category.trim(),
        question: values.question.trim(),
        answerMd: values.answerMd,
        isPublished: values.isPublished,
      };
      if (!article) {
        await create.mutateAsync(next);
        return;
      }
      const body: UpdateArticleBody = {};
      if (next.category !== article.category) body.category = next.category;
      if (next.question !== article.question) body.question = next.question;
      if (next.answerMd !== article.answerMd) body.answerMd = next.answerMd;
      if (next.isPublished !== article.isPublished) body.isPublished = next.isPublished;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ article, body });
    },
    { fields: ['category', 'question', 'answerMd', 'isPublished'] },
  );

  return (
    <FormDialog
      open
      size="lg"
      title={article ? 'Edit article' : 'New article'}
      sub="Answers that customers read before they write to support."
      confirm={article ? 'Save changes' : 'Save article'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <HelpTopicField control={control} topics={topics} loading={loading} />
        <TextField
          label="Question"
          autoComplete="off"
          maxLength={200}
          autoFocus
          error={errors.question}
          {...register('question', { validate: (value) => value.trim() !== '' || 'Enter the question.' })}
        />
        <TextareaField
          label="Answer (Markdown)"
          className="mono"
          rows={8}
          spellCheck={false}
          error={errors.answerMd}
          {...register('answerMd', { validate: (value) => value.trim() !== '' || 'Enter the answer.' })}
        />
        <CheckboxField
          label="Published on the help centre"
          error={errors.isPublished}
          {...register('isPublished')}
        />
      </div>
    </FormDialog>
  );
}
