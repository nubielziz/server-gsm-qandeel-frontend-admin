// SupportAlerts: draws nothing; it mounts `useSupportAlerts` on every page through the manifest's top bar slot, the way the bell mounts its stream hooks,
// so the alert sound and the desktop notification work whichever page the staff member is on.
import { useSupportAlerts } from '../hooks/useSupportAlerts';

export function SupportAlerts() {
  useSupportAlerts();
  return null;
}
