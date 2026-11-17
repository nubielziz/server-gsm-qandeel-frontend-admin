// The composer's form model and how it becomes the API body: the audience as switches and filters (`AudienceForm`), the message (one title and one text),
// the client-side hints (the server checks everything again and its field errors are shown too) and the presets of the audience builder.
import type { Id } from '@/lib/api';
import type {
  AudiencePreviewBody,
  AudienceSpec,
  CampaignChannel,
  CampaignDetail,
  CampaignInput,
  CampaignPurpose,
  PersonRef,
  PersonType,
} from '../types';

export type MerchantStatus = 'active' | 'pending';
export type CustomerAccounts = 'all' | 'accounts' | 'guests';

/** A person added to or left out of the audience. The name is only for the list on screen; the API takes the type and id. */
export type PickedPerson = PersonRef & { name: string; detail?: string };

export type AudienceForm = {
  staff: { on: boolean; roleIds: Id[] };
  merchants: { on: boolean; statuses: MerchantStatus[]; groupIds: Id[]; countries: string };
  customers: { on: boolean; accounts: CustomerAccounts; countries: string };
  include: PickedPerson[];
  exclude: PickedPerson[];
};

export type ComposerForm = {
  name: string;
  purpose: CampaignPurpose;
  channels: CampaignChannel[];
  audience: AudienceForm;
  content: { title: string; body: string };
  link: { staff: string; merchant: string; customer: string };
};

/** The buttons above the segments. Each fills the audience; "people" turns every segment off so only the picked people count. */
export type AudiencePreset = 'everyone' | 'staff' | 'merchants' | 'customers' | 'people';

export const PRESET_ITEMS: readonly { value: AudiencePreset; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'staff', label: 'Staff' },
  { value: 'merchants', label: 'Merchants' },
  { value: 'customers', label: 'Customers' },
  { value: 'people', label: 'Specific people' },
];

/** Limits the server enforces, repeated here for the hints and the counters. */
export const NAME_MAX = 120;
export const TITLE_MAX = 120;
export const BODY_MAX = 3500;
export const MAX_PEOPLE = 500;

const SITE_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/?#=&%]{0,199}$/;
const COUNTRY = /^[A-Z]{2}$/;

const noSegments = (): Pick<AudienceForm, 'staff' | 'merchants' | 'customers'> => ({
  staff: { on: false, roleIds: [] },
  merchants: { on: false, statuses: ['active'], groupIds: [], countries: '' },
  customers: { on: false, accounts: 'all', countries: '' },
});

/** A new campaign: a service announcement by in-app and email, with nobody chosen yet (the staff member picks the audience on purpose). */
export function emptyForm(): ComposerForm {
  return {
    name: '',
    purpose: 'service',
    channels: ['in_app', 'email'],
    audience: { ...noSegments(), include: [], exclude: [] },
    content: { title: '', body: '' },
    link: { staff: '', merchant: '', customer: '' },
  };
}

/** The audience a preset stands for. The people added or left out are kept, they are not part of a preset. */
export function applyPreset(audience: AudienceForm, preset: AudiencePreset): AudienceForm {
  const next: AudienceForm = { ...noSegments(), include: audience.include, exclude: audience.exclude };
  if (preset === 'everyone') {
    next.staff.on = true;
    next.merchants.on = true;
    next.customers = { ...next.customers, on: true, accounts: 'accounts' };
  }
  if (preset === 'staff') next.staff.on = true;
  if (preset === 'merchants') next.merchants.on = true;
  if (preset === 'customers') next.customers.on = true;
  return next;
}

/** The preset the segments match exactly, or '' when the staff member has narrowed them with filters (no button is then lit). */
export function detectPreset(audience: AudienceForm): AudiencePreset | '' {
  const candidates: AudiencePreset[] = ['everyone', 'staff', 'merchants', 'customers', 'people'];
  const same = (preset: AudiencePreset) => {
    const wanted = applyPreset(audience, preset);
    return (
      JSON.stringify([wanted.staff, wanted.merchants, wanted.customers]) ===
      JSON.stringify([audience.staff, audience.merchants, audience.customers])
    );
  };
  return candidates.find(same) ?? '';
}

/** Splits "jo, sa" into upper-case codes (no duplicates) and the words that are not an ISO 3166-1 alpha-2 code. */
export function parseCountries(text: string): { codes: string[]; invalid: string[] } {
  const words = text
    .split(/[\s,;]+/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(words)];
  return {
    codes: unique.filter((word) => COUNTRY.test(word)),
    invalid: unique.filter((word) => !COUNTRY.test(word)),
  };
}

const person = ({ type, id }: PickedPerson): PersonRef => ({ type, id });

/** The audience in the API's shape: a segment is present when its switch is on, a filter only when it narrows something. */
export function audienceToSpec(form: AudienceForm): AudienceSpec {
  const spec: AudienceSpec = {};
  if (form.staff.on) spec.staff = form.staff.roleIds.length > 0 ? { roleIds: form.staff.roleIds } : {};
  if (form.merchants.on) {
    const { statuses, groupIds, countries } = form.merchants;
    const codes = parseCountries(countries).codes;
    spec.merchants = {
      // The server's default is active merchants only, so the plain case sends nothing.
      ...(statuses.length > 0 && !(statuses.length === 1 && statuses[0] === 'active') ? { statuses } : {}),
      ...(groupIds.length > 0 ? { groupIds } : {}),
      ...(codes.length > 0 ? { countries: codes } : {}),
    };
  }
  if (form.customers.on) {
    const { accounts, countries } = form.customers;
    const codes = parseCountries(countries).codes;
    spec.customers = {
      ...(accounts === 'accounts'
        ? { hasAccount: true }
        : accounts === 'guests'
          ? { hasAccount: false }
          : {}),
      ...(codes.length > 0 ? { countries: codes } : {}),
    };
  }
  if (form.include.length > 0) spec.include = form.include.map(person);
  if (form.exclude.length > 0) spec.exclude = form.exclude.map(person);
  return spec;
}

const unnamed = (ref: PersonRef): PickedPerson => ({ ...ref, name: `${PERSON_WORD[ref.type]} #${ref.id}` });

/** The word for a kind of person, in the singular. */
export const PERSON_WORD: Record<PersonType, string> = {
  staff: 'Staff member',
  client: 'Merchant',
  customer: 'Customer',
};

/** A stored audience as the form shows it (the people have no names: the spec keeps only their ids). */
export function specToAudienceForm(spec: AudienceSpec): AudienceForm {
  const form: AudienceForm = {
    ...noSegments(),
    include: (spec.include ?? []).map(unnamed),
    exclude: (spec.exclude ?? []).map(unnamed),
  };
  if (spec.staff) form.staff = { on: true, roleIds: spec.staff.roleIds ?? [] };
  if (spec.merchants) {
    form.merchants = {
      on: true,
      statuses: spec.merchants.statuses ?? ['active'],
      groupIds: spec.merchants.groupIds ?? [],
      countries: (spec.merchants.countries ?? []).join(', '),
    };
  }
  if (spec.customers) {
    const { hasAccount } = spec.customers;
    form.customers = {
      on: true,
      accounts: hasAccount === true ? 'accounts' : hasAccount === false ? 'guests' : 'all',
      countries: (spec.customers.countries ?? []).join(', '),
    };
  }
  return form;
}

/** Telegram reaches merchants only: it needs the merchants segment or a picked merchant. */
export function telegramAllowed(audience: AudienceForm): boolean {
  return audience.merchants.on || audience.include.some((p) => p.type === 'client');
}

/** The kinds of people the audience reaches, which decides which link fields the message form shows. */
export function targetedTypes(audience: AudienceForm): PersonType[] {
  const has = (type: PersonType) => audience.include.some((p) => p.type === type);
  const types: PersonType[] = [];
  if (audience.staff.on || has('staff')) types.push('staff');
  if (audience.merchants.on || has('client')) types.push('client');
  if (audience.customers.on || has('customer')) types.push('customer');
  return types;
}

/** Whether anyone is targeted at all: a segment is on or a person is added. */
export function hasTarget(audience: AudienceForm): boolean {
  return audience.staff.on || audience.merchants.on || audience.customers.on || audience.include.length > 0;
}

/** Drops Telegram when the audience no longer has merchants, so the channel never stays ticked while it is disabled. */
export function keepChannelsValid(form: ComposerForm): ComposerForm {
  if (telegramAllowed(form.audience) || !form.channels.includes('telegram')) return form;
  return { ...form, channels: form.channels.filter((channel) => channel !== 'telegram') };
}

const trimmed = (text: { title: string; body: string }) => ({
  title: text.title.trim(),
  body: text.body.trim(),
});

/** The form in the API's shape: the trimmed title and text; the link only with the paths that were filled in. */
export function formToInput(form: ComposerForm): CampaignInput {
  const link = Object.fromEntries(
    (['staff', 'merchant', 'customer'] as const)
      .map((key) => [key, form.link[key].trim()] as const)
      .filter(([, value]) => value !== ''),
  );
  return {
    name: form.name.trim(),
    purpose: form.purpose,
    channels: form.channels,
    audience: audienceToSpec(form.audience),
    content: trimmed(form.content),
    link: Object.keys(link).length > 0 ? link : null,
  };
}

/** A saved campaign as the composer shows it. A duplicate gets "(copy)" in its name and is saved as a new draft. */
export function campaignToForm(
  campaign: CampaignDetail,
  options: { duplicate?: boolean } = {},
): ComposerForm {
  return {
    name: options.duplicate ? `${campaign.name} (copy)`.slice(0, NAME_MAX) : campaign.name,
    purpose: campaign.purpose,
    channels: campaign.channels,
    audience: specToAudienceForm(campaign.audience),
    content: { title: campaign.content.title, body: campaign.content.body },
    link: {
      staff: campaign.link?.staff ?? '',
      merchant: campaign.link?.merchant ?? '',
      customer: campaign.link?.customer ?? '',
    },
  };
}

/** The hints keyed by the field name the server also uses (`name`, `channels`, `audience`, `content.title`, `link.staff`…). */
export type Problems = Record<string, string>;

/** What can be said about the audience and the channels without asking the server; it decides whether the live count may run. */
export function audienceProblems(form: ComposerForm): Problems {
  const problems: Problems = {};
  const { audience } = form;
  if (!hasTarget(audience)) problems.audience = 'Choose at least one group of people, or add people.';
  if (audience.merchants.on && audience.merchants.statuses.length === 0) {
    problems['audience.merchants.statuses'] = 'Choose at least one merchant status.';
  }
  for (const [key, text] of [
    ['audience.merchants.countries', audience.merchants.on ? audience.merchants.countries : ''],
    ['audience.customers.countries', audience.customers.on ? audience.customers.countries : ''],
  ] as const) {
    const { codes, invalid } = parseCountries(text);
    if (invalid.length > 0)
      problems[key] = `Use two-letter country codes such as JO, SA. Not a code: ${invalid.join(', ')}.`;
    else if (codes.length > 50) problems[key] = 'Use at most 50 countries.';
  }
  if (audience.include.length > MAX_PEOPLE) problems.include = `Add at most ${MAX_PEOPLE} people.`;
  if (audience.exclude.length > MAX_PEOPLE) problems.exclude = `Leave out at most ${MAX_PEOPLE} people.`;
  if (form.channels.length === 0) problems.channels = 'Choose at least one channel.';
  if (form.channels.includes('telegram') && !telegramAllowed(audience)) {
    problems.channels = 'Telegram reaches merchants only: target merchants or remove Telegram.';
  }
  return problems;
}

/** Every hint the composer can give before saving (the audience and channel ones, the name, the title and text, and the links). */
export function composerProblems(form: ComposerForm): Problems {
  const problems = audienceProblems(form);
  if (form.name.trim() === '') problems.name = 'Give the campaign a name.';
  if (form.content.title.trim() === '') problems['content.title'] = 'Write the title.';
  if (form.content.body.trim() === '') problems['content.body'] = 'Write the text.';
  for (const key of ['staff', 'merchant', 'customer'] as const) {
    const value = form.link[key].trim();
    if (value !== '' && !SITE_PATH.test(value)) {
      problems[`link.${key}`] = 'Use a path on the site that starts with one /, such as /account/orders.';
    }
  }
  return problems;
}

/** The question the live count asks for this form, or null while the audience or the channels are not complete (no request is made then). */
export function countRequest(form: ComposerForm): AudiencePreviewBody | null {
  if (Object.keys(audienceProblems(form)).length > 0) return null;
  return { audience: audienceToSpec(form.audience), channels: form.channels, purpose: form.purpose };
}
