// Tests for the checks a file passes before it is uploaded: type by declared type or extension, empty, too large, too many; and the size text of a chip.
import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  isAllowedType,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  refusalFor,
} from './attachments';

const file = (name: string, type: string, size = 100) => ({ name, type, size });

describe('isAllowedType', () => {
  it('accepts PDF, JPEG and PNG by their type', () => {
    for (const type of ['application/pdf', 'image/jpeg', 'image/png'])
      expect(isAllowedType(file('x', type))).toBe(true);
  });

  it('refuses any other declared type, whatever the name says', () => {
    expect(isAllowedType(file('photo.png', 'image/gif'))).toBe(false);
    expect(isAllowedType(file('run.pdf', 'application/x-msdownload'))).toBe(false);
  });

  it('reads the extension when the browser gave no type', () => {
    expect(isAllowedType(file('SCAN.JPG', ''))).toBe(true);
    expect(isAllowedType(file('notes.txt', ''))).toBe(false);
    expect(isAllowedType(file('noextension', ''))).toBe(false);
  });
});

describe('refusalFor', () => {
  it('accepts a good file', () => {
    expect(refusalFor(file('a.pdf', 'application/pdf'), 0)).toBeNull();
    expect(
      refusalFor(file('a.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES), MAX_ATTACHMENTS - 1),
    ).toBeNull();
  });

  it('says why not: a sixth file, a wrong type, an empty file, a file over 5 MB', () => {
    expect(refusalFor(file('a.pdf', 'application/pdf'), MAX_ATTACHMENTS)).toBe(
      'A message can have 5 files at most.',
    );
    expect(refusalFor(file('a.gif', 'image/gif'), 0)).toBe('Only PDF, JPEG and PNG files can be attached.');
    expect(refusalFor(file('a.pdf', 'application/pdf', 0), 0)).toBe('This file is empty.');
    expect(refusalFor(file('a.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1), 0)).toBe(
      'This file is larger than 5 MB.',
    );
  });
});

describe('formatFileSize', () => {
  it('writes bytes, KB and MB', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(340 * 1024)).toBe('340 KB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
