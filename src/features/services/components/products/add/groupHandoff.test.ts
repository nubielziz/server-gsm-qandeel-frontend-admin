// Tests for the hand-off between +Add Service and +Add Group: the address with its return key, and the draft kept in the session (per kind, read as
// untrusted, with the new group chosen in it).
import { beforeEach, describe, expect, it } from 'vitest';
import { addServiceDefaults, type AddServiceValues } from './addServiceForm';
import {
  addGroupFromAddPath,
  chooseDraftGroup,
  clearAddDraft,
  readAddDraft,
  saveAddDraft,
} from './groupHandoff';

beforeEach(() => sessionStorage.clear());

const TYPED: AddServiceValues = {
  ...addServiceDefaults(),
  name: 'Pixel Check',
  code: 'IMEI-PX-1',
  categoryId: '2',
  active: false,
  deliveryAmount: '3',
  deliveryUnit: 'hours',
  credit: '3.5',
  ownCost: '2.25',
  stockDelivery: true,
};

describe('the address of +Add Group opened from +Add Service', () => {
  it('is the +Add Group address of the kind with the return key', () => {
    expect(addGroupFromAddPath('imei')).toBe('/products?view=add-group&type=imei&return=add');
    expect(addGroupFromAddPath('server')).toBe('/products?view=add-group&type=server&return=add');
  });
});

describe('the draft', () => {
  it('is null until something is saved, and comes back as it was saved', () => {
    expect(readAddDraft('imei')).toBeNull();
    saveAddDraft('imei', TYPED);
    expect(readAddDraft('imei')).toEqual(TYPED);
  });

  it('is kept per kind', () => {
    saveAddDraft('imei', TYPED);
    expect(readAddDraft('server')).toBeNull();
    clearAddDraft('server');
    expect(readAddDraft('imei')).toEqual(TYPED);
  });

  it('is gone once cleared', () => {
    saveAddDraft('imei', TYPED);
    clearAddDraft('imei');
    expect(readAddDraft('imei')).toBeNull();
  });

  it('is read as untrusted: a field of the wrong shape falls back to the blank form', () => {
    sessionStorage.setItem(
      'gsm-products-add-draft:imei',
      JSON.stringify({
        name: 'Kept',
        code: 7,
        active: 'yes',
        deliveryUnit: 'weeks',
        credit: '2',
        ownCost: 4.7,
        stockDelivery: 'yes',
      }),
    );
    expect(readAddDraft('imei')).toEqual({
      ...addServiceDefaults(),
      name: 'Kept',
      credit: '2',
    });
  });

  it('is null when the session holds something that is not a draft', () => {
    for (const junk of ['not json', 'null', '"text"', '[1,2]']) {
      sessionStorage.setItem('gsm-products-add-draft:imei', junk);
      expect(readAddDraft('imei')).toBeNull();
    }
  });
});

describe('choosing the new group in the draft', () => {
  it('sets the group and keeps everything typed', () => {
    saveAddDraft('imei', TYPED);
    chooseDraftGroup('imei', 41);
    expect(readAddDraft('imei')).toEqual({ ...TYPED, categoryId: '41' });
  });

  it('starts a blank draft with the group when nothing was kept', () => {
    chooseDraftGroup('server', 9);
    expect(readAddDraft('server')).toEqual({ ...addServiceDefaults(), categoryId: '9' });
    expect(readAddDraft('imei')).toBeNull();
  });
});
