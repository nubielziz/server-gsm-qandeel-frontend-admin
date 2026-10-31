// Helpers of the failed-jobs drawer (route group `health`): which rows a page asks for and how attempts read.
import { PAGE_SIZE, type HealthPage } from '../../hooks';
import type { FailedJob } from '../../types';

/** The row range of a 1-based page: page 2 is rows 25 up to (not including) 50, the API's `_start` and `_end`. */
export function pageRange(page: number): HealthPage {
  const first = Math.max(1, Math.floor(page));
  return { start: (first - 1) * PAGE_SIZE, end: first * PAGE_SIZE };
}

/** "5 of 5 attempts": how many times the job was tried, out of how many the queue allows. */
export function attemptsText(job: Pick<FailedJob, 'attemptsMade' | 'maxAttempts'>): string {
  return `${job.attemptsMade} of ${job.maxAttempts} attempts`;
}
