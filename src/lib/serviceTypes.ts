// Service types and their words, shared by every feature that names them (orders, the catalog, the shop content, suppliers).
// They live below the features so that no feature has to load another one only to print "IMEI": the features import each
// other in a circle (orders reads suppliers, suppliers reads the shop content, the shop content names service types), and a
// value read from a feature that is still loading is undefined.

/** The four kinds of service the API knows. */
export type ServiceType = 'imei' | 'server' | 'remote' | 'file';

/** Service types as the console spells them (the API sends them in lower case). */
export const TYPE_LABEL: Readonly<Record<ServiceType, string>> = {
  imei: 'IMEI',
  server: 'Server',
  remote: 'Remote',
  file: 'File',
};

/** The four kinds, in the order the console lists them everywhere. */
export const SERVICE_TYPES: readonly ServiceType[] = ['imei', 'server', 'remote', 'file'];
