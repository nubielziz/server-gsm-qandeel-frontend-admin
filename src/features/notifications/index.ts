// Public surface of the notifications feature: the campaign and inbox API functions, their types and the paths of its pages. The pages themselves are not
// re-exported here: they load lazily from `./pages`. The bell is the manifest's `topbar` control.
export * from './api';
export { campaignLogPath, campaignPath, notificationsListPath } from './lib/filters';
export * from './types';
