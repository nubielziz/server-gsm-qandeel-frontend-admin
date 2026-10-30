// Tests for the support page's address: reading and writing the filters, the open thread, the page and the view, the links other
// pages use, and how the filters become API filters.
import { describe, expect, it } from 'vitest';
import {
  defaultFilter,
  hasActiveFilters,
  inboxSort,
  parsePage,
  parseSupportFilters,
  parseTicketId,
  parseView,
  supportListPath,
  supportTicketPath,
  toListFilters,
  toListQuery,
  toRefineFilters,
  writePage,
  writeSupportFilters,
  writeTicket,
  writeView,
} from './filters';

const params = (query: string) => new URLSearchParams(query);

describe('parseSupportFilters', () => {
  it('opens on the open tickets, everyone, no search', () => {
    expect(parseSupportFilters(params(''))).toEqual({ filter: 'open', who: 'all', q: '', customerId: null });
  });

  it('reads each parameter', () => {
    expect(parseSupportFilters(params('filter=late&who=merchants&q=refund&customerId=28'))).toEqual({
      filter: 'late',
      who: 'merchants',
      q: 'refund',
      customerId: 28,
    });
  });

  it('opens one customer’s tickets on All unless the address says otherwise', () => {
    expect(parseSupportFilters(params('customerId=28')).filter).toBe('all');
    expect(parseSupportFilters(params('customerId=28&filter=resolved')).filter).toBe('resolved');
    expect(defaultFilter(28)).toBe('all');
    expect(defaultFilter(null)).toBe('open');
  });

  it('drops anything unknown or malformed', () => {
    expect(parseSupportFilters(params('filter=zzz&who=nobody&customerId=abc'))).toEqual({
      filter: 'open',
      who: 'all',
      q: '',
      customerId: null,
    });
    expect(parseSupportFilters(params('customerId=0')).customerId).toBeNull();
    expect(parseSupportFilters(params('customerId=-4')).customerId).toBeNull();
  });
});

describe('writeSupportFilters', () => {
  it('leaves defaults out, so a clean address means open tickets for everyone', () => {
    expect(writeSupportFilters(params('filter=late'), { filter: 'open' }).toString()).toBe('');
    expect(writeSupportFilters(params(''), { who: 'customers' }).toString()).toBe('who=customers');
    expect(writeSupportFilters(params('who=customers'), { who: 'all' }).toString()).toBe('');
  });

  it('drops the open thread and the page, so the list starts again', () => {
    expect(writeSupportFilters(params('ticket=4202&page=3'), { filter: 'late' }).toString()).toBe(
      'filter=late',
    );
  });

  it('keeps the parameters it does not own', () => {
    expect(writeSupportFilters(params('order=5&view=templates'), { q: 'x' }).toString()).toBe(
      'order=5&view=templates&q=x',
    );
  });

  it('keeps the filter that follows a customer’s default out of the address', () => {
    expect(writeSupportFilters(params(''), { customerId: 28 }).toString()).toBe('customerId=28');
    expect(writeSupportFilters(params('customerId=28'), { filter: 'open' }).toString()).toBe(
      'customerId=28&filter=open',
    );
  });

  it('writes the filter it keeps when the customer goes, so the list does not jump to Open', () => {
    expect(writeSupportFilters(params('customerId=28'), { customerId: null, filter: 'all' }).toString()).toBe(
      'filter=all',
    );
  });

  it('keeps an explicit filter when a customer is added or removed', () => {
    expect(writeSupportFilters(params('filter=late'), { customerId: 28 }).toString()).toBe(
      'filter=late&customerId=28',
    );
    expect(writeSupportFilters(params('filter=late&customerId=28'), { customerId: null }).toString()).toBe(
      'filter=late',
    );
  });
});

describe('the thread, the page and the view', () => {
  it('reads and writes the open ticket', () => {
    expect(parseTicketId(params('ticket=4202'))).toBe(4202);
    expect(parseTicketId(params('ticket=x'))).toBeNull();
    expect(parseTicketId(params(''))).toBeNull();
    expect(writeTicket(params('filter=late'), 4202).toString()).toBe('filter=late&ticket=4202');
    expect(writeTicket(params('filter=late&ticket=4202'), null).toString()).toBe('filter=late');
  });

  it('reads and writes the page, leaving page 1 out', () => {
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=-2'))).toBe(1);
    expect(parsePage(params(''))).toBe(1);
    expect(writePage(params('q=a'), 2).toString()).toBe('q=a&page=2');
    expect(writePage(params('q=a&page=2'), 1).toString()).toBe('q=a');
  });

  it('switches the view and leaves the inbox’s thread and page behind', () => {
    expect(parseView(params('view=templates'))).toBe('templates');
    expect(parseView(params('view=other'))).toBe('inbox');
    expect(writeView(params('filter=late&ticket=1&page=2'), 'templates').toString()).toBe(
      'filter=late&view=templates',
    );
    expect(writeView(params('view=templates&filter=late'), 'inbox').toString()).toBe('filter=late');
  });
});

describe('hasActiveFilters', () => {
  it('is false for the defaults and true for any change', () => {
    expect(hasActiveFilters(parseSupportFilters(params('')))).toBe(false);
    expect(hasActiveFilters(parseSupportFilters(params('customerId=28')))).toBe(false);
    expect(hasActiveFilters(parseSupportFilters(params('filter=late')))).toBe(true);
    expect(hasActiveFilters(parseSupportFilters(params('who=customers')))).toBe(true);
    expect(hasActiveFilters(parseSupportFilters(params('q=%20x')))).toBe(true);
    expect(hasActiveFilters(parseSupportFilters(params('q=%20')))).toBe(false);
  });
});

describe('links to the page', () => {
  it('builds the overdue link and a customer’s link', () => {
    expect(supportListPath()).toBe('/support');
    expect(supportListPath({ filter: 'late' })).toBe('/support?filter=late');
    expect(supportListPath({ customerId: 28 })).toBe('/support?customerId=28');
  });

  it('builds the link to one ticket, optionally on All', () => {
    expect(supportTicketPath(4202)).toBe('/support?ticket=4202');
    expect(supportTicketPath(4202, 'all')).toBe('/support?ticket=4202&filter=all');
  });
});

describe('to the API', () => {
  const filters = (query: string) => parseSupportFilters(params(query));

  it('turns each filter into the question for the server', () => {
    expect(toListFilters(filters(''))).toEqual({ status: ['new', 'open', 'pending'] });
    expect(toListFilters(filters('filter=late'))).toEqual({ late: true });
    expect(toListFilters(filters('filter=mine'), 7)).toEqual({ assigneeId: 7 });
    expect(toListFilters(filters('filter=mine'))).toEqual({});
    expect(toListFilters(filters('filter=resolved'))).toEqual({ status: 'resolved' });
    expect(toListFilters(filters('filter=all'))).toEqual({});
  });

  it('adds who wrote and the trimmed search', () => {
    expect(toListFilters(filters('filter=all&who=customers'))).toEqual({ requesterType: 'customer' });
    expect(toListFilters(filters('filter=all&who=merchants&q=%20cairo%20'))).toEqual({
      requesterType: 'client',
      q: 'cairo',
    });
  });

  it('asks for one customer’s tickets whatever Who says', () => {
    expect(toListFilters(filters('customerId=28&who=merchants'))).toEqual({
      requesterType: 'customer',
      requesterId: 28,
    });
  });

  it('sorts late tickets first, except under Resolved', () => {
    expect(inboxSort('open')).toEqual([
      { field: 'late', order: 'desc' },
      { field: 'updatedAt', order: 'desc' },
    ]);
    expect(inboxSort('resolved')).toEqual([{ field: 'updatedAt', order: 'desc' }]);
  });

  it('writes the same filters for Refine and for a plain list call', () => {
    const list = { status: ['new', 'open'] as ('new' | 'open')[], late: true, q: 'x' };
    expect(toRefineFilters(list)).toEqual([
      { field: 'status', operator: 'in', value: ['new', 'open'] },
      { field: 'late', operator: 'eq', value: true },
      { field: 'q', operator: 'eq', value: 'x' },
    ]);
    expect(toRefineFilters({ status: [] })).toEqual([]);
    expect(toListQuery(list, { start: 0, end: 1 })).toEqual({
      start: 0,
      end: 1,
      q: 'x',
      filters: { status: ['new', 'open'], late: true },
    });
  });
});
