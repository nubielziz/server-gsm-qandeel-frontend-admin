// Public surface of the services feature: the `/admin/services*`, categories, pricing-rules, pricing and inventory API functions, their
// types, the data-provider registry, the palette source, and `servicesListPath` for links into the page (`/services?belowFloor=true`,
// a tab with a service selected). The page itself is not re-exported here: it loads lazily from `./pages`.
export * from './api';
export * from './lib/paletteSource';
export { servicesListPath, type ServicesLink } from './lib/paths';
export * from './types';
