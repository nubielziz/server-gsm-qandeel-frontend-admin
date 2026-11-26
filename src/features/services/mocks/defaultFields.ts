// The custom fields a service starts with when it is created by hand, as the server gives them (decision 031). An IMEI service gets the
// default IMEI field; the other types start with none. The mock keeps the rule in one place so the add flow and its tests read the same field.
import type { ServiceField, ServiceType } from '../types';

/**
 * The default field of an IMEI service: named and labelled IMEI, of the `imei` type, required and the main input. Staff may change or
 * remove it freely afterwards: an IMEI service forces nothing.
 */
export function defaultImeiField(): ServiceField {
  return {
    key: 'imei',
    name: 'IMEI',
    label: 'IMEI',
    fieldType: 'imei',
    required: true,
    options: [],
    regex: '',
    isMainInput: true,
  };
}

/** The fields a new service of this type starts with: the default IMEI field for an IMEI service, none for the others. */
export function defaultFieldsOf(type: ServiceType): ServiceField[] {
  return type === 'imei' ? [defaultImeiField()] : [];
}
