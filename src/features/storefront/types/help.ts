// Types of the Help centre tab: an article as `GET /admin/help-articles` sends it and the bodies of its endpoints. The
// shapes beyond the generated row (`help_articles`) are assumed contracts (listed in HANDOFF.md).
import type { HelpArticleRow } from '@/lib/api/schema.gen';

/** One help article. The answer is Markdown; `helpfulYes` and `helpfulNo` are the readers' votes. */
export type HelpArticle = Pick<
  HelpArticleRow,
  | 'id'
  | 'category'
  | 'question'
  | 'answerMd'
  | 'locale'
  | 'isPublished'
  | 'helpfulYes'
  | 'helpfulNo'
  | 'sort'
  | 'createdAt'
  | 'updatedAt'
>;

/** Body of `POST /admin/help-articles` (assumed contract). */
export type CreateArticleBody = {
  category: string;
  question: string;
  answerMd: string;
  locale: string;
  isPublished?: boolean;
};

/** Body of `PATCH /admin/help-articles/:id` (assumed contract): the edit dialog and the publish switch send only what changes. */
export type UpdateArticleBody = Partial<CreateArticleBody>;

/** What `GET /admin/help-articles` filters by: `q` (question, topic), `isPublished`, `category` and `locale`. */
export type ArticleListFilters = {
  q?: string;
  isPublished?: boolean;
  category?: string;
  locale?: string;
};
