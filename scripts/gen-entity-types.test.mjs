// Tests for the entity type generator: the column-to-type rules of decision 011.
import { describe, expect, it } from 'vitest';
import { tables } from '../reference/gsm-map/data/schema.mjs';
import {
  camelCase,
  columnType,
  descriptionProblems,
  parseColumn,
  render,
  rowTypeName,
} from './gen-entity-types.mjs';
import { tableDescriptions } from './table-descriptions.en.mjs';

const type = (table, spec, fk) => columnType(table, spec, fk ? new Map(Object.entries(fk)) : undefined);

describe('columnType (decision 011 rules)', () => {
  it('omits secrets and the base columns', () => {
    for (const spec of [
      'password_hash nullable',
      'totp_secret_enc',
      'token_hash',
      'key_hash',
      'id',
      'created_at',
    ]) {
      expect(type('t', spec)).toBeNull();
    }
  });

  it('maps ids, dates and flags', () => {
    expect(type('t', 'role_id')).toBe('Id');
    expect(type('t', 'client_id nullable')).toBe('Id | null');
    expect(type('t', 'last_login_at')).toBe('IsoDateTime | null');
    expect(type('t', 'valid_to')).toBe('IsoDateTime | null');
    expect(type('t', 'twofa_enabled')).toBe('boolean');
    expect(type('t', 'allow_cancel')).toBe('boolean');
    expect(type('t', 'must_change_password')).toBe('boolean');
    expect(type('t', 'three_ds')).toBe('boolean');
  });

  it('maps money, rates and counters', () => {
    expect(type('t', 'unit_price')).toBe('Money');
    expect(type('t', 'fee_amount')).toBe('Money');
    expect(type('t', 'fee_fixed')).toBe('Money');
    expect(type('t', 'overdraft_limit')).toBe('Money');
    expect(type('t', 'total_spent')).toBe('Money');
    expect(type('t', 'balance_after')).toBe('Money');
    expect(type('t', 'fee_percent')).toBe('Decimal');
    expect(type('t', 'rate_to_base')).toBe('Decimal');
    expect(type('t', 'tax_rate')).toBe('Decimal');
    expect(type('t', 'rate_limit_per_min')).toBe('number');
    expect(type('t', 'timeout_ms')).toBe('number');
    expect(type('t', 'sort')).toBe('number');
    expect(type('t', 'cost_currency')).toBe('string');
  });

  it('maps array and json hints', () => {
    expect(type('t', 'file_ids bigint[]')).toBe('Id[]');
    expect(type('t', 'permissions text[]')).toBe('string[]');
    expect(type('t', 'allowed_ips cidr[]')).toBe('string[]');
    expect(type('t', 'qty_options int[]')).toBe('number[]');
    expect(type('t', 'allowed_group_ids')).toBe('Id[]');
    expect(type('t', 'requires jsonb')).toBe('JsonObject');
    expect(type('t', 'before')).toBe('JsonValue');
  });

  it('keeps external identifiers as strings and staff references as ids', () => {
    expect(type('t', 'gateway_txn_id')).toBe('string');
    expect(type('t', 'customer_vat_id')).toBe('string');
    expect(type('t', 'created_by')).toBe('Id');
    expect(type('t', 'created_by nullable')).toBe('Id | null');
    expect(type('t', 'reviewer', { reviewer: 'fk' })).toBe('Id');
    expect(type('t', 'allowed', { allowed: 'array' })).toBe('Id[]');
  });

  it('applies per-table overrides and defaults to string', () => {
    expect(type('support_tickets', 'priority')).toBe('string');
    expect(type('pricing_rules', 'priority')).toBe('number');
    expect(type('legal_documents', 'version')).toBe('string');
    expect(type('t', 'subject')).toBe('string');
  });

  it('rejects a column hint it does not know', () => {
    expect(() => parseColumn('x geometry')).toThrow(/Unknown column hint/);
  });
});

describe('names', () => {
  it('camelCases columns', () => {
    expect(camelCase('twofa_enabled')).toBe('twofaEnabled');
    expect(camelCase('supports_3ds')).toBe('supports3ds');
    expect(camelCase('og_file_id')).toBe('ogFileId');
  });

  it('names row types from singular PascalCase table names', () => {
    expect(rowTypeName('staff_users')).toBe('StaffUserRow');
    expect(rowTypeName('service_categories')).toBe('ServiceCategoryRow');
    expect(rowTypeName('ledger_entries')).toBe('LedgerEntryRow');
    expect(rowTypeName('settings')).toBe('SettingRow');
    expect(rowTypeName('tac_catalog')).toBe('TacCatalogRow');
    expect(rowTypeName('kyc_submissions')).toBe('KycSubmissionRow');
  });
});

describe('the real schema', () => {
  it('has an English description for every table', () => {
    expect(descriptionProblems(tables, tableDescriptions)).toEqual([]);
  });

  it('reports a missing or Arabic description', () => {
    const sample = [{ n: 'a' }, { n: 'b' }, { n: 'c' }];
    expect(descriptionProblems(sample, { a: 'Fine.', b: 'عربي' })).toEqual([
      'b: description contains Arabic',
      'c: no English description',
    ]);
  });

  it('renders one row type per table, with the base columns and without secrets', () => {
    const text = render(tables, tableDescriptions);
    expect(text).toContain('generated, do not edit');
    expect((text.match(/^export interface \w+Row \{/gm) ?? []).length).toBe(tables.length);
    expect(text).toMatch(/export interface StaffUserRow \{\n {2}id: Id;\n {2}email: string;/);
    expect(text).not.toMatch(/passwordHash|tokenHash|totpSecretEnc|keyHash|codeEnc/);
    expect(text).toContain('createdAt: IsoDateTime;\n  updatedAt?: IsoDateTime;');
    expect(text).not.toMatch(/[؀-ۿ]/);
  });
});
