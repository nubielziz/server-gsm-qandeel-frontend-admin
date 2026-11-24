// Tests for the Search tab's pure helpers: byte text and the small formatters of the index panel.
import { describe, expect, it } from 'vitest';
import { bytesText, documentsNote, engineNote, lastErrorHint } from './search';

describe('bytesText', () => {
  it('prints bytes in steps of 1024 and says when there is no figure', () => {
    expect(bytesText(512)).toBe('512 B');
    expect(bytesText(48_234_496)).toBe('46 MB');
    expect(bytesText(1_288_490_189)).toBe('1.2 GB');
    expect(bytesText(null)).toBe('No data');
  });
});

describe('small helpers', () => {
  it('says how far the index is from the catalogue', () => {
    expect(documentsNote(14, 14)).toBe('in sync with the catalogue');
    expect(documentsNote(11, 14)).toBe('3 missing from the index');
    expect(documentsNote(16, 14)).toBe('2 more than the catalogue');
  });

  it('says what the shop does while the engine is not running', () => {
    expect(engineNote('ok', '30.2')).toBe('Typesense 30.2');
    expect(engineNote('ok', null)).toBeUndefined();
    expect(engineNote('not_ready', null)).toMatch(/no index yet/);
    expect(engineNote('down', null)).toMatch(/database search/);
  });

  it('turns the engine’s disk refusal into a sentence and leaves other errors alone', () => {
    expect(lastErrorHint('Rejecting write: running out of resource type: OUT_OF_DISK')).toMatch(
      /disk is nearly full/,
    );
    expect(lastErrorHint('Import of 3 documents failed')).toBeUndefined();
    expect(lastErrorHint(null)).toBeUndefined();
  });
});
