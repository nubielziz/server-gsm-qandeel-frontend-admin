// Tests for joining the loaded pages.
import { describe, expect, it } from 'vitest';
import type { AuditLog } from '../types';
import { joinPages } from './pages';

const row = (id: number): AuditLog => ({
  id,
  actorType: 'staff',
  actorId: 1,
  action: 'did',
  entityType: 'order',
  entityId: id,
  ip: null,
  createdAt: '2026-03-05T10:00:00.000Z',
});

describe('joinPages', () => {
  it('puts the pages one after the other', () => {
    expect(joinPages([{ data: [row(5), row(4)] }, { data: [row(3)] }]).map((r) => r.id)).toEqual([5, 4, 3]);
  });

  it('keeps one copy of an entry that moved to the next page while someone was reading', () => {
    const joined = joinPages([{ data: [row(5), row(4)] }, { data: [row(4), row(3)] }]);
    expect(joined.map((r) => r.id)).toEqual([5, 4, 3]);
  });

  it('gives nothing for no pages', () => {
    expect(joinPages([])).toEqual([]);
  });
});
