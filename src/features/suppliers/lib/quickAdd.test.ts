// Tests for Quick add's keys, counts, request body and words.
import { describe, expect, it } from 'vitest';
import type { QuickAddRun, ServiceGroup } from '../types';
import {
  allPickable,
  groupKey,
  groupName,
  groupOption,
  groupValue,
  isLive,
  lastRunLine,
  matchesSearch,
  MAX_QUICK_ADD_GROUPS,
  pickedGroups,
  pickedTotals,
  progressLine,
  progressRatio,
  quickAddBody,
  resultLines,
  servicesText,
  sourceText,
  tooManyGroups,
} from './quickAdd';

const group = (type: string, remoteGroup: string, addable: number, other = 0): ServiceGroup => ({
  type,
  remoteGroup,
  total: addable + other,
  addable,
  imported: other,
  unavailable: 0,
  unsupported: 0,
});

const GROUPS = [
  group('imei', 'Apple', 5),
  group('server', 'Apple', 3),
  group('imei', 'Samsung', 0, 4), // everything is in the console
  group('imei', '', 2),
];
const keys = (...picked: ServiceGroup[]) => new Set(picked.map(groupKey));

const run = (changes: Partial<QuickAddRun> = {}): QuickAddRun => ({
  id: 1,
  supplierId: 1,
  scope: 'all',
  groups: [],
  serviceStatus: 'active',
  publish: 'none',
  status: 'succeeded',
  total: 10,
  processed: 10,
  created: 10,
  skipped: 0,
  failed: 0,
  categoriesCreated: 0,
  failures: [],
  error: null,
  requestedBy: 1,
  createdAt: '2026-11-11T10:00:00.000Z',
  startedAt: '2026-11-11T10:00:01.000Z',
  finishedAt: '2026-11-11T10:00:30.000Z',
  ...changes,
});

describe('where a run takes its services from', () => {
  it('names every group or counts the picked ones, with the supplier', () => {
    expect(sourceText('all', 12, 'Nordic GSM')).toBe('all groups of Nordic GSM');
    expect(sourceText('groups', 1, 'Nordic GSM')).toBe('1 group of Nordic GSM');
    expect(sourceText('groups', 3, 'Nordic GSM')).toBe('3 groups of Nordic GSM');
  });
});

describe('the keys of a group', () => {
  it('tell two types that share a group name apart, and one group from another', () => {
    expect(groupKey(GROUPS[0])).not.toBe(groupKey(GROUPS[1]));
    expect(groupKey(group('a', 'b|c', 1))).not.toBe(groupKey(group('a|b', 'c', 1)));
    expect(groupKey(GROUPS[0])).toBe(groupKey({ type: 'imei', remoteGroup: 'Apple' }));
  });

  it('name the group without a name, label it with its type, and survive the select box', () => {
    expect(groupName(GROUPS[3])).toBe('No group');
    expect(groupName(GROUPS[0])).toBe('Apple');
    expect(groupOption(GROUPS[1])).toBe('Apple (SERVER)');
    expect(JSON.parse(groupValue(group('imei', 'Say "hi" \u0000 | ok', 1)))).toEqual([
      'imei',
      'Say "hi" \u0000 | ok',
    ]);
  });

  it('match the search on the name or the type, in any case', () => {
    expect(matchesSearch(GROUPS[0], '')).toBe(true);
    expect(matchesSearch(GROUPS[0], '  appl ')).toBe(true);
    expect(matchesSearch(GROUPS[1], 'SERVER')).toBe(true);
    expect(matchesSearch(GROUPS[2], 'apple')).toBe(false);
    expect(matchesSearch(GROUPS[3], 'no group')).toBe(true);
  });
});

describe('what the picks add up to', () => {
  it('counts the picked groups and their services, ignoring a group with nothing to add', () => {
    expect(pickedTotals(GROUPS, keys(GROUPS[0], GROUPS[1]))).toEqual({ groups: 2, services: 8 });
    expect(pickedTotals(GROUPS, keys(GROUPS[2]))).toEqual({ groups: 0, services: 0 });
    // A pick of a group that has since gone is ignored.
    expect(pickedTotals(GROUPS, new Set([groupKey(group('file', 'Gone', 3))]))).toEqual({
      groups: 0,
      services: 0,
    });
    expect(pickedGroups(GROUPS, keys(GROUPS[3], GROUPS[0])).map(groupName)).toEqual(['Apple', 'No group']);
  });
});

describe('what "Select all groups" stands for', () => {
  it('is every group with something to add, how many they are and what they add, whatever the search shows', () => {
    expect(allPickable(GROUPS)).toEqual({
      keys: [GROUPS[0], GROUPS[1], GROUPS[3]].map(groupKey),
      groups: 3,
      services: 10,
    });
    expect(allPickable([GROUPS[2]])).toEqual({ keys: [], groups: 0, services: 0 });
    expect(allPickable([])).toEqual({ keys: [], groups: 0, services: 0 });
  });
});

describe('the body of the start request', () => {
  it('names the picked groups when some are left out', () => {
    expect(quickAddBody(GROUPS, keys(GROUPS[0], GROUPS[3]), 'active')).toEqual({
      scope: 'groups',
      groups: [
        { type: 'imei', remoteGroup: 'Apple' },
        { type: 'imei', remoteGroup: '' },
      ],
    });
  });

  it('is the scope all when every group with something to add is picked, whatever else is in the list', () => {
    expect(quickAddBody(GROUPS, keys(GROUPS[0], GROUPS[1], GROUPS[3]), 'active')).toEqual({ scope: 'all' });
    // A pick of the group with nothing to add does not count for or against.
    expect(quickAddBody(GROUPS, keys(GROUPS[0], GROUPS[1], GROUPS[2], GROUPS[3]), 'active')).toEqual({
      scope: 'all',
    });
  });

  it('sends the service status only when the services are added switched off', () => {
    expect(quickAddBody(GROUPS, keys(GROUPS[0]), 'disabled')).toEqual({
      scope: 'groups',
      groups: [{ type: 'imei', remoteGroup: 'Apple' }],
      serviceStatus: 'disabled',
    });
    expect(quickAddBody(GROUPS, keys(GROUPS[0], GROUPS[1], GROUPS[3]), 'disabled')).toEqual({
      scope: 'all',
      serviceStatus: 'disabled',
    });
  });

  it('adds publish: { listed: true } only when the tick box is on, with either scope and with the service status', () => {
    expect(quickAddBody(GROUPS, keys(GROUPS[0]), 'active', true)).toEqual({
      scope: 'groups',
      groups: [{ type: 'imei', remoteGroup: 'Apple' }],
      publish: { listed: true },
    });
    expect(quickAddBody(GROUPS, keys(GROUPS[0], GROUPS[1], GROUPS[3]), 'active', true)).toEqual({
      scope: 'all',
      publish: { listed: true },
    });
    expect(quickAddBody(GROUPS, keys(GROUPS[0], GROUPS[1], GROUPS[3]), 'active', false)).toEqual({
      scope: 'all',
    });
    // The dialog never passes it for switched off services; the function itself sends what it is told.
    expect(quickAddBody(GROUPS, keys(GROUPS[0]), 'disabled', true)).toMatchObject({
      serviceStatus: 'disabled',
      publish: { listed: true },
    });
  });

  it('has no groups when nothing is picked, and flags more groups than a request can carry', () => {
    expect(quickAddBody(GROUPS, new Set(), 'active')).toEqual({ scope: 'groups', groups: [] });
    const many = Array.from({ length: MAX_QUICK_ADD_GROUPS + 2 }, (_, index) =>
      group('imei', `G${index}`, 1),
    );
    const some = new Set(many.slice(0, MAX_QUICK_ADD_GROUPS + 1).map(groupKey));
    expect(tooManyGroups(quickAddBody(many, some, 'active'))).toBe(true);
    expect(tooManyGroups(quickAddBody(many, new Set(many.map(groupKey)), 'active'))).toBe(false);
    expect(tooManyGroups(quickAddBody(many, new Set(many.slice(0, 500).map(groupKey)), 'active'))).toBe(
      false,
    );
  });
});

describe('where a run is', () => {
  it('is live while queued or running, and not once it is over', () => {
    expect(isLive(run({ status: 'queued' }))).toBe(true);
    expect(isLive(run({ status: 'running' }))).toBe(true);
    expect(isLive(run({ status: 'succeeded' }))).toBe(false);
    expect(isLive(run({ status: 'failed' }))).toBe(false);
  });

  it('works out the bar and the line under it', () => {
    expect(progressRatio(run({ status: 'running', processed: 25, total: 100 }))).toBe(0.25);
    expect(progressRatio(run({ status: 'running', processed: 0, total: 0 }))).toBe(0);
    expect(progressRatio(run({ status: 'succeeded', processed: 3, total: 4 }))).toBe(1);
    expect(progressLine(run({ processed: 40, total: 120, created: 38 }))).toBe(
      '40 of 120 services, 38 added',
    );
    expect(progressLine(run({ processed: 0, total: 1, created: 0 }))).toBe('0 of 1 service, 0 added');
  });

  it('lists what a run did, leaving out every count that is zero', () => {
    expect(resultLines(run({ created: 1200 }))).toEqual(['1,200 services added']);
    expect(resultLines(run({ created: 1 }))).toEqual(['1 service added']);
    expect(resultLines(run({ created: 8, skipped: 2, categoriesCreated: 1, failed: 3 }))).toEqual([
      '8 services added',
      '2 skipped (already in the console or no longer available)',
      '1 category created',
      '3 could not be added',
    ]);
    expect(resultLines(run({ created: 5, categoriesCreated: 4 }))).toEqual([
      '5 services added',
      '4 categories created',
    ]);
    expect(servicesText(0)).toBe('0 services');
  });

  it('words the last run for the first step, and says nothing about a run that is still going', () => {
    const now = Date.parse('2026-11-11T12:00:30.000Z');
    expect(lastRunLine(null, now)).toBeNull();
    expect(lastRunLine(run({ status: 'running' }), now)).toBeNull();
    expect(lastRunLine(run({ created: 42 }), now)).toBe('Last quick add 2h ago: 42 added');
    expect(
      lastRunLine(run({ status: 'failed', error: 'Too many services could not be added (20).' }), now),
    ).toBe('Last quick add 2h ago stopped: Too many services could not be added (20).');
    // A run closed as stalled has no finish time: the start is used.
    expect(lastRunLine(run({ status: 'failed', finishedAt: null, error: null }), now)).toBe(
      'Last quick add 2h ago stopped: it did not finish',
    );
  });
});
