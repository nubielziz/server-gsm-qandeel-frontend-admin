// The Refine resources of the storefront feature after decision 025 (Shop content trimmed): which ones are registered and with which
// operations. The TAC catalogue and the three search tool lists are gone.
import { describe, expect, it } from 'vitest';
import { storefrontResources } from './resources';

describe('storefrontResources', () => {
  it('registers the six resources and none of the retired ones', () => {
    expect(Object.keys(storefrontResources).sort()).toEqual([
      'content-pages',
      'help-articles',
      'legal-documents',
      'retail-price-changes',
      'retail-price-rules',
      'service-listings',
    ]);
  });

  it('gives each resource only the operations its endpoints offer', () => {
    // Legal documents are written and published, never edited or deleted.
    expect(Object.keys(storefrontResources['legal-documents'] ?? {}).sort()).toEqual([
      'create',
      'list',
      'show',
    ]);
    // The retail pricing lists are read through Refine; their writes go through the typed functions.
    expect(Object.keys(storefrontResources['retail-price-rules'] ?? {})).toEqual(['list']);
    expect(Object.keys(storefrontResources['retail-price-changes'] ?? {})).toEqual(['list']);
    for (const name of ['service-listings', 'content-pages', 'help-articles']) {
      expect(Object.keys(storefrontResources[name] ?? {}).sort(), name).toEqual([
        'create',
        'list',
        'show',
        'update',
      ]);
    }
  });
});
