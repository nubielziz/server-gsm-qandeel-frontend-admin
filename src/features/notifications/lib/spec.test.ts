// Tests for the composer's form model: presets, the form to the API body and back, country parsing, and the hints (audience, channels, message, links).
import { describe, expect, it } from 'vitest';
import { campaignDetail } from '../test/fixtures';
import {
  applyPreset,
  audienceProblems,
  audienceToSpec,
  campaignToForm,
  composerProblems,
  countRequest,
  detectPreset,
  emptyForm,
  formToInput,
  hasTarget,
  parseCountries,
  specToAudienceForm,
  targetedTypes,
  type ComposerForm,
} from './spec';

const filled = (change: Partial<ComposerForm> = {}): ComposerForm => ({
  ...emptyForm(),
  name: 'Winter promo',
  content: { title: 'Hello', body: 'Big news, {{name}}.' },
  audience: applyPreset(emptyForm().audience, 'staff'),
  ...change,
});

describe('presets', () => {
  it('Everyone is active staff, active merchants and customers with an account', () => {
    expect(audienceToSpec(applyPreset(emptyForm().audience, 'everyone'))).toEqual({
      staff: {},
      merchants: {},
      customers: { hasAccount: true },
    });
  });

  it('Staff, Merchants and Customers each target one group, and Specific people targets none', () => {
    const audience = emptyForm().audience;
    expect(audienceToSpec(applyPreset(audience, 'staff'))).toEqual({ staff: {} });
    expect(audienceToSpec(applyPreset(audience, 'merchants'))).toEqual({ merchants: {} });
    expect(audienceToSpec(applyPreset(audience, 'customers'))).toEqual({ customers: {} });
    expect(audienceToSpec(applyPreset(applyPreset(audience, 'everyone'), 'people'))).toEqual({});
  });

  it('a preset keeps the people that were added or left out', () => {
    const person = { type: 'staff' as const, id: 3, name: 'Nadia' };
    const audience = { ...emptyForm().audience, include: [person], exclude: [person] };
    const next = applyPreset(audience, 'customers');
    expect(next.include).toEqual([person]);
    expect(next.exclude).toEqual([person]);
  });

  it('detects the preset the segments match, and none once a filter narrows them', () => {
    const audience = emptyForm().audience;
    expect(detectPreset(applyPreset(audience, 'everyone'))).toBe('everyone');
    expect(detectPreset(applyPreset(audience, 'merchants'))).toBe('merchants');
    expect(detectPreset(audience)).toBe('people');
    const narrowed = { ...applyPreset(audience, 'staff'), staff: { on: true, roleIds: [2] } };
    expect(detectPreset(narrowed)).toBe('');
  });
});

describe('the audience in the API shape', () => {
  it('sends a filter only when it narrows something', () => {
    const audience = {
      ...emptyForm().audience,
      staff: { on: true, roleIds: [2, 3] },
      merchants: {
        on: true,
        statuses: ['active', 'pending'] as ('active' | 'pending')[],
        groupIds: [4],
        countries: 'jo, sa',
      },
      customers: { on: true, accounts: 'guests' as const, countries: 'sa' },
    };
    expect(audienceToSpec(audience)).toEqual({
      staff: { roleIds: [2, 3] },
      merchants: { statuses: ['active', 'pending'], groupIds: [4], countries: ['JO', 'SA'] },
      customers: { hasAccount: false, countries: ['SA'] },
    });
  });

  it('leaves active-only merchants to the server default', () => {
    expect(audienceToSpec(applyPreset(emptyForm().audience, 'merchants'))).toEqual({ merchants: {} });
  });

  it('sends only the type and id of picked people', () => {
    const audience = {
      ...emptyForm().audience,
      include: [{ type: 'client' as const, id: 5, name: 'Zain Hub', detail: 'z@x.example' }],
      exclude: [{ type: 'customer' as const, id: 9, name: 'Sam' }],
    };
    expect(audienceToSpec(audience)).toEqual({
      include: [{ type: 'client', id: 5 }],
      exclude: [{ type: 'customer', id: 9 }],
    });
  });

  it('reads a stored spec back into the form and out again unchanged', () => {
    const spec = {
      staff: { roleIds: [1] },
      merchants: { statuses: ['pending' as const], countries: ['JO'] },
      customers: { hasAccount: true, countries: ['SA'] },
      include: [{ type: 'staff' as const, id: 2 }],
    };
    const form = specToAudienceForm(spec);
    expect(form.include[0].name).toBe('Staff member #2');
    expect(audienceToSpec(form)).toEqual(spec);
  });
});

describe('countries', () => {
  it('upper-cases, splits on commas and spaces, drops duplicates and names what is not a code', () => {
    expect(parseCountries('jo, SA;ae  jo')).toEqual({ codes: ['JO', 'SA', 'AE'], invalid: [] });
    expect(parseCountries('Jordan, JO')).toEqual({ codes: ['JO'], invalid: ['JORDAN'] });
    expect(parseCountries('  ')).toEqual({ codes: [], invalid: [] });
  });
});

describe('channels and who is targeted', () => {
  it('lists the kinds of people the audience reaches, in the server order', () => {
    expect(targetedTypes(applyPreset(emptyForm().audience, 'everyone'))).toEqual([
      'staff',
      'client',
      'customer',
    ]);
    expect(
      targetedTypes({ ...emptyForm().audience, include: [{ type: 'customer', id: 1, name: 'A' }] }),
    ).toEqual(['customer']);
    expect(hasTarget(emptyForm().audience)).toBe(false);
  });
});

describe('the form to the API body', () => {
  it('trims the text and sends the link only with the paths filled in', () => {
    const body = formToInput(
      filled({
        name: '  Winter promo ',
        content: { title: ' Hello ', body: ' Hi ' },
        link: { staff: '/orders', merchant: '  ', customer: '' },
      }),
    );
    expect(body).toEqual({
      name: 'Winter promo',
      purpose: 'service',
      channels: ['in_app', 'email'],
      audience: { staff: {} },
      content: { title: 'Hello', body: 'Hi' },
      link: { staff: '/orders' },
    });
  });

  it('has a null link when no path was written', () => {
    expect(formToInput(filled()).link).toBeNull();
  });

  it('fills the form from a campaign, and a duplicate gets "(copy)"', () => {
    const detail = campaignDetail({ link: { customer: '/account/orders' } });
    expect(campaignToForm(detail).name).toBe('Winter promo');
    expect(campaignToForm(detail, { duplicate: true }).name).toBe('Winter promo (copy)');
    expect(campaignToForm(detail).link.customer).toBe('/account/orders');
    expect(campaignToForm(detail).content).toEqual({
      title: 'Winter promo',
      body: 'Hello {{name}},\nBig news.',
    });
  });
});

describe('the hints', () => {
  it('asks for a name, the title and text, and an audience', () => {
    const problems = composerProblems(emptyForm());
    expect(Object.keys(problems).sort()).toEqual(['audience', 'content.body', 'content.title', 'name']);
  });

  it('accepts a complete form', () => {
    expect(composerProblems(filled())).toEqual({});
  });

  it('checks the links against the site-path rule', () => {
    expect(
      composerProblems(
        filled({ link: { staff: 'https://evil.example', merchant: '//evil', customer: '/account/orders' } }),
      ),
    ).toMatchObject({
      'link.staff': expect.any(String),
      'link.merchant': expect.any(String),
    });
    expect(
      composerProblems(filled({ link: { staff: '/orders?order=7', merchant: '', customer: '' } })),
    ).toEqual({});
  });

  it('names a country that is not a code, and no channel', () => {
    const audience = {
      ...applyPreset(emptyForm().audience, 'customers'),
      customers: { on: true, accounts: 'all' as const, countries: 'Jordan' },
    };
    expect(audienceProblems(filled({ audience }))['audience.customers.countries']).toMatch(/JORDAN/);
    expect(audienceProblems(filled({ channels: [] })).channels).toBe('Choose at least one channel.');
  });

  it('wants at least one merchant status when merchants are on', () => {
    const audience = {
      ...applyPreset(emptyForm().audience, 'merchants'),
      merchants: { on: true, statuses: [], groupIds: [], countries: '' },
    };
    expect(audienceProblems(filled({ audience }))['audience.merchants.statuses']).toBeDefined();
  });
});

describe('the live count request', () => {
  it('is null until the audience and channels are complete, then the body of audience-preview', () => {
    expect(countRequest(emptyForm())).toBeNull();
    expect(countRequest(filled())).toEqual({
      audience: { staff: {} },
      channels: ['in_app', 'email'],
      purpose: 'service',
    });
    expect(countRequest(filled({ channels: [] }))).toBeNull();
  });
});
