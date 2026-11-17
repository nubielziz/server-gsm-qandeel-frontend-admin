// Tests for the page kind and status words, and the public paths the table shows.
import { describe, expect, it } from 'vitest';
import { KIND_FILTER_ITEMS, kindLabel, pagePath, pageStatus } from './kinds';

describe('kinds', () => {
  it('has the demo’s filter: All, then the five landing kinds', () => {
    expect(KIND_FILTER_ITEMS.map((item) => item.label)).toEqual([
      'All',
      'Carrier',
      'Phone model',
      'Free tool',
      'Brand',
      'Country',
    ]);
    expect(KIND_FILTER_ITEMS[0].value).toBe('');
  });

  it('names a kind and passes an unknown one through', () => {
    expect(kindLabel('blog')).toBe('Blog post');
    expect(kindLabel('static')).toBe('Page');
    expect(kindLabel('mystery')).toBe('mystery');
  });
});

describe('pageStatus', () => {
  it('words the three statuses of the demo and treats an unknown one as a draft', () => {
    expect(pageStatus('noindex').label).toBe('Hidden from Google');
    expect(pageStatus('published').tone).toBe('good');
    expect(pageStatus('archived').label).toBe('Draft');
  });
});

describe('pagePath', () => {
  it('shows the path the demo showed under a title, with the slug as the server sent it', () => {
    expect(pagePath('carrier', 'unlock-iphone-on-att')).toBe('/unlock/unlock-iphone-on-att');
    expect(pagePath('blog', 'is-my-iphone-locked')).toBe('/blog/is-my-iphone-locked');
    expect(pagePath('static', 'about')).toBe('/about');
  });
});
