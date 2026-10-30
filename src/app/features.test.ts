// Tests for the feature manifest collector: found manifests, sorted by id, and loud failures for wiring mistakes.
import { describe, expect, it } from 'vitest';
import type { FeatureManifest } from './featureManifest';
import { collectManifests, featureManifests } from './features';

const page = (name: string) => ({ name, heading: name, list: async () => () => null });

describe('collectManifests', () => {
  it('returns the manifests sorted by id', () => {
    const found = { b: { manifest: { id: 'b' } }, a: { manifest: { id: 'a' } } };
    expect(collectManifests(found).map((manifest) => manifest.id)).toEqual(['a', 'b']);
  });

  it('fails on a file without a manifest, a duplicate id or a page claimed twice', () => {
    expect(() => collectManifests({ 'x/manifest.ts': {} })).toThrow('x/manifest.ts must export `manifest`');
    expect(() => collectManifests({ a: { manifest: { id: 'a' } }, b: { manifest: { id: 'a' } } })).toThrow(
      'Two feature manifests use the id "a"',
    );
    const one: FeatureManifest = { id: 'one', page: page('orders') };
    const two: FeatureManifest = { id: 'two', page: page('orders') };
    expect(() => collectManifests({ one: { manifest: one }, two: { manifest: two } })).toThrow(
      'Two features fill the page "orders"',
    );
  });
});

describe('featureManifests', () => {
  it('finds the built features of this app', () => {
    expect(featureManifests.map((manifest) => manifest.id)).toEqual(
      expect.arrayContaining(['access', 'finance', 'orders']),
    );
  });
});
