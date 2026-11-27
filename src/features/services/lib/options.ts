// The text forms of the Custom Fields section of the edit view's Field part: a select field's choices as one comma-separated line, and the
// menu of field types.
import type { SelectOption } from '@/components/ui';
import type { ServiceFieldType } from '../types';

/** A select field's choices as one line: `Red, Green, Blue`. */
export function choicesText(choices: readonly string[]): string {
  return choices.join(', ');
}

/** The choices of a select field from the line the form holds. */
export function parseChoices(text: string): string[] {
  return text
    .split(',')
    .map((choice) => choice.trim())
    .filter((choice) => choice !== '');
}

/** The kinds of custom field and the words that name them: the four plain ones, then the eleven the server checks (decisions 031 and 034). The menu is the same for every service type. */
export const FIELD_TYPE_OPTIONS: readonly (SelectOption & { value: ServiceFieldType })[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Choice list' },
  { value: 'textarea', label: 'Long text' },
  { value: 'imei', label: 'IMEI (15 digits)' },
  { value: 'imei_bulk', label: 'IMEI list (one per line, up to 30)' },
  { value: 'imeisv', label: 'IMEISV (16 digits)' },
  { value: 'serial', label: 'Serial number' },
  { value: 'iccid', label: 'ICCID (SIM number)' },
  { value: 'eid', label: 'EID (eSIM, 32 digits)' },
  { value: 'meid', label: 'MEID' },
  { value: 'ecid', label: 'ECID' },
  { value: 'mac_address', label: 'MAC address' },
  { value: 'mi_lock_code', label: 'Mi lock code' },
  { value: 'box_sn', label: 'Box serial number' },
];

/**
 * What a buyer must type in a field of each kind the server checks, one short sentence each (the help of the Field part). The four plain
 * kinds have none. The words follow the server's rules; the console checks nothing of them.
 */
export const FIELD_TYPE_HELP: Partial<Record<ServiceFieldType, string>> = {
  imei: 'one IMEI with a valid check digit.',
  imei_bulk: 'one IMEI per line, up to 30, each with a valid check digit.',
  imeisv: '16 digits.',
  serial: '5 to 30 letters and digits.',
  iccid: '18 to 22 digits, starting with 89.',
  eid: '32 digits.',
  meid: '14 or 15 hexadecimal characters (0-9, A-F), or 18 digits.',
  ecid: '8 to 16 hexadecimal characters (a leading 0x is fine), or 8 to 20 digits.',
  mac_address: '12 hexadecimal characters, like AA:BB:CC:DD:EE:FF.',
  mi_lock_code: '6 to 64 letters, digits and dashes.',
  box_sn: '4 to 32 letters, digits and dashes.',
};
