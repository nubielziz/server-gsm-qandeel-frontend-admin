// Tests for what a save of the listing form sends: only the fields that differ from the listing, and nothing when none does.
import { describe, expect, it, vi } from 'vitest';
import { toFormValues } from '../../lib/listingForm';
import type { ServiceListingDetail } from '../../types';
import { saveListingForm } from './listingSave';

const listing: ServiceListingDetail = {
  id: 5,
  serviceId: 5,
  slug: 'att-unlock',
  publicTitle: 'AT&T Unlock',
  summary: '',
  etaText: '',
  brand: 'Apple',
  carrier: '',
  country: '',
  sort: 2,
  seoTitle: '',
  seoDescription: '',
  isListed: true,
  isFeatured: false,
  listedAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  imageUrl: null,
  service: { id: 5, name: 'AT&T', code: 'IMEI-ATT', basePrice: '17.2800', cost: '13.5000' },
  retailPrice: '25.9900',
  retailPriceSource: 'manual',
  retailPriceRule: null,
  retailPriceWaiting: false,
  floorPrice: '19.0100',
  marginPct: '48.0569',
  orders30d: 0,
  revenue30d: '0.0000',
  locked: false,
  lockedReason: null,
  descriptionMd: '',
  requirementsMd: '',
};

describe('saveListingForm', () => {
  it('sends nothing and answers null when the form is as the listing was', async () => {
    const update = vi.fn();
    expect(await saveListingForm(toFormValues(listing), listing, update)).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('sends only the changed fields and answers what the server stored', async () => {
    const stored = { ...listing, summary: 'Unlock an AT&T iPhone.' };
    const update = vi.fn().mockResolvedValue(stored);
    const saved = await saveListingForm(
      { ...toFormValues(listing), summary: 'Unlock an AT&T iPhone.' },
      listing,
      update,
    );
    expect(update).toHaveBeenCalledWith({ listing, body: { summary: 'Unlock an AT&T iPhone.' } });
    expect(saved).toBe(stored);
  });

  it('lets a refusal of the server reach the caller', async () => {
    const update = vi.fn().mockRejectedValue(new Error('The slug is already used.'));
    await expect(
      saveListingForm({ ...toFormValues(listing), slug: 'ee-uk-unlock' }, listing, update),
    ).rejects.toThrow('The slug is already used.');
  });
});
