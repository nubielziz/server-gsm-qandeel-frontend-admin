// Mock of the access routes (admin accounts, IP rules, the restriction, roles, permissions and sessions). The parts
// live in their own files; the order matters, because a generic `/:id` handler would answer `/check` otherwise.
import { ipRuleHandlers } from './accessIpRules';
import { roleHandlers } from './accessRoles';
import { sessionHandlers } from './accessSessions';
import { staffHandlers } from './accessStaff';

export const accessHandlers = [...staffHandlers, ...ipRuleHandlers, ...roleHandlers, ...sessionHandlers];
