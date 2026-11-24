// Tests for the click check behind the unsaved-changes question: which clicks are plain ones, and which links would take the app to another
// address (a link inside the app that opens in this tab and is not the address the app is at already).
import { afterEach, describe, expect, it } from 'vitest';
import { isPlainClick, leaveLink } from './leaveLink';

const HERE = { pathname: '/records', search: '?id=7&part=overview' };

/** A link in the page, with a child inside it (a click lands on the child), so the closest-link search is exercised. */
function link(attributes: Record<string, string>) {
  const anchor = document.createElement('a');
  for (const [name, value] of Object.entries(attributes)) anchor.setAttribute(name, value);
  const inner = document.createElement('span');
  anchor.append(inner);
  document.body.append(anchor);
  return { anchor, inner };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('leaveLink', () => {
  it('gives the path, query and hash of a link inside the app, also when the click lands on a child of the link', () => {
    const { anchor, inner } = link({ href: '/records?id=7&part=settings#top' });
    expect(leaveLink(anchor, HERE)).toBe('/records?id=7&part=settings#top');
    expect(leaveLink(inner, HERE)).toBe('/records?id=7&part=settings#top');
  });

  it('reads a link to the same site written in full, and one written relative', () => {
    const origin = window.location.origin;
    expect(leaveLink(link({ href: `${origin}/orders?tab=all` }).anchor, HERE)).toBe('/orders?tab=all');
    expect(leaveLink(link({ href: 'orders' }).anchor, HERE)).toBe('/orders');
  });

  it('is null when the click is not on a link', () => {
    const button = document.createElement('button');
    document.body.append(button);
    expect(leaveLink(button, HERE)).toBeNull();
    expect(leaveLink(null, HERE)).toBeNull();
    expect(leaveLink(document, HERE)).toBeNull();
  });

  it('is null for a link without an address', () => {
    expect(leaveLink(link({}).anchor, HERE)).toBeNull();
  });

  it('is null for the address the app is at already, but not for the same path with another query', () => {
    expect(leaveLink(link({ href: '/records?id=7&part=overview' }).anchor, HERE)).toBeNull();
    expect(leaveLink(link({ href: '/records?id=8&part=overview' }).anchor, HERE)).not.toBeNull();
    expect(leaveLink(link({ href: '/records' }).anchor, HERE)).not.toBeNull();
  });

  it('is null for a move inside the page, a link to another site, a mail link and a script link', () => {
    expect(leaveLink(link({ href: '#main' }).anchor, HERE)).toBeNull();
    expect(leaveLink(link({ href: 'https://example.com/records' }).anchor, HERE)).toBeNull();
    expect(leaveLink(link({ href: 'mailto:someone@example.com' }).anchor, HERE)).toBeNull();
    expect(leaveLink(link({ href: 'javascript:void(0)' }).anchor, HERE)).toBeNull();
  });

  it('is null for a link that opens another tab or window, or downloads a file', () => {
    expect(leaveLink(link({ href: '/orders', target: '_blank' }).anchor, HERE)).toBeNull();
    expect(leaveLink(link({ href: '/orders', target: 'other' }).anchor, HERE)).toBeNull();
    expect(leaveLink(link({ href: '/orders/export', download: '' }).anchor, HERE)).toBeNull();
  });

  it('treats a link that names this tab as a move', () => {
    expect(leaveLink(link({ href: '/orders', target: '_self' }).anchor, HERE)).toBe('/orders');
  });

  it('takes the origin to compare with as a parameter', () => {
    const { anchor } = link({ href: 'https://shop.example/orders' });
    expect(leaveLink(anchor, HERE, 'https://shop.example')).toBe('/orders');
  });
});

describe('isPlainClick', () => {
  const click = (changes: Partial<Parameters<typeof isPlainClick>[0]> = {}) => ({
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    ...changes,
  });

  it('is true for the primary button alone', () => {
    expect(isPlainClick(click())).toBe(true);
  });

  it('is false for another button, a modifier key, or a click something else already handled', () => {
    for (const changes of [
      { button: 1 },
      { button: 2 },
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { defaultPrevented: true },
    ]) {
      expect(isPlainClick(click(changes))).toBe(false);
    }
  });
});
