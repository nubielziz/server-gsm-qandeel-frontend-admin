// Types for the access feature (`/access`): admin accounts, IP rules, roles and sessions. The map names these routes
// but gives no bodies (MISMATCHES M10), so every shape below is an assumed contract. Each one is built from a
// generated row in `src/lib/api/schema.gen.ts`, narrowed to what the screens use.
import type { StaffStatus } from '@/features/auth';
import type { Id, IsoDateTime } from '@/lib/api';
import type { IpRuleRow, RoleRow, SessionRow, StaffUserRow } from '@/lib/api/schema.gen';

/** A person as the API names them in a join: id and display name. */
export type PersonRef = { id: Id; name: string };

// ---- Staff ----

/**
 * One admin account, as `GET /admin/staff` and `GET /admin/staff/:id` send it (assumed contract).
 * The row's `roleId` becomes a `role` object, the creator and suspender become `{ id, name }`, and the number of
 * open sessions is added. `resetSentAt` is an optional extra: when the latest invitation or reset link was sent
 * (the map keeps it in `auth_tokens`); without it the screen only says that a link was sent.
 */
export type StaffMember = Omit<
  StaffUserRow,
  'roleId' | 'status' | 'lastLoginIp' | 'suspendedReason' | 'suspendedBy' | 'createdBy' | 'updatedAt'
> & {
  role: { id: Id; name: string };
  status: StaffStatus;
  lastLoginIp: string | null;
  activeSessions: number;
  createdBy: PersonRef | null;
  suspendedReason: string | null;
  suspendedBy: PersonRef | null;
  resetSentAt?: IsoDateTime | null;
};

/** How a new admin gets their first password: an emailed link, or a temporary one the server generates. */
export type StaffOnboarding = 'invite' | 'temporary_password';

/** Body of `POST /admin/staff` (assumed contract). */
export type CreateStaffBody = { name: string; email: string; roleId: Id; onboarding: StaffOnboarding };

/** The new account; `temporaryPassword` is present once, only for the temporary-password onboarding. */
export type CreateStaffResult = StaffMember & { temporaryPassword?: string };

/** Body of `PATCH /admin/staff/:id`: only the fields that change (assumed contract). */
export type UpdateStaffBody = { name?: string; email?: string; roleId?: Id };

/** Replace a password with an emailed set-password link, or with a temporary one. */
export type PasswordMode = 'reset_link' | 'temporary_password';

/** Body of `POST /admin/staff/:id/password` (assumed contract). */
export type StaffPasswordBody = { mode: PasswordMode; revokeSessions: boolean };

/** Answer of `POST /admin/staff/:id/password`: the temporary password, shown once, for the temporary mode only. */
export type StaffPasswordResult = { temporaryPassword?: string };

/** Body of `POST /admin/staff/:id/suspend` (assumed contract). */
export type SuspendStaffBody = { reason: string };

// ---- IP rules ----

export type IpRuleKind = 'allow' | 'block';

/** Who a rule is about: storefront customers, merchants on the API, admins on the console, or all three. */
export type IpScope = 'store' | 'api' | 'admin' | 'all';

/** `auto` rules are added by the risk engine, `manual` ones by a staff member. */
export type IpRuleSource = 'manual' | 'auto';

/**
 * An allowed or blocked address or range, as `GET /admin/ip-rules` sends it (assumed contract). `createdBy` is
 * null for rules the risk engine added; `expiresAt` is null for a rule that lasts until someone removes it.
 */
export type IpRule = Omit<IpRuleRow, 'kind' | 'scope' | 'source' | 'createdBy' | 'updatedAt'> & {
  kind: IpRuleKind;
  scope: IpScope;
  source: IpRuleSource;
  createdBy: PersonRef | null;
};

/** Body of `POST /admin/ip-rules` (assumed contract). Allow rules are always for the admin console. */
export type CreateIpRuleBody = {
  kind: IpRuleKind;
  scope: IpScope;
  cidr: string;
  label?: string;
  reason?: string;
  expiresAt?: IsoDateTime;
};

/** Body of `POST /admin/ip-rules/check` (assumed contract). */
export type CheckIpBody = { ip: string; scope: IpScope };

/** What would happen to a visitor, and the rule that decided it (null when no rule applies). */
export type CheckIpResult = { decision: 'allowed' | 'refused'; rule: IpRule | null };

/** Body and answer of `PUT /admin/access/restriction` (assumed contract). */
export type RestrictionBody = { enabled: boolean };
export type RestrictionResult = { enabled: boolean };

// ---- Roles and permissions ----

/** A role and its permission strings (`staff:read`, `orders:*`, `*`), as `GET /admin/roles` sends it. */
export type Role = Pick<RoleRow, 'id' | 'name' | 'permissions'> & { staffCount?: number };

/** Body of `POST /admin/roles` (assumed contract); an update sends only what changes. */
export type CreateRoleBody = { name: string; permissions: string[] };
export type UpdateRoleBody = Partial<CreateRoleBody>;

/** One permission the picker offers, after `normalisePermissions`: its key, a readable label and its group. */
export type Permission = { key: string; label: string; group: string };

/** What `GET /admin/permissions` may send: plain keys, or objects with an optional label and group. */
export type PermissionsAnswer = readonly (string | { key: string; label?: string; group?: string })[];

// ---- Sessions ----

/** Staff sessions and merchant (`client`) sessions share one list. */
export type SessionSubjectType = 'staff' | 'client';

/** One open sign-in session, as `GET /admin/sessions` sends it (assumed contract). `current` marks the caller's own. */
export type Session = Omit<SessionRow, 'subjectType' | 'subjectId' | 'revokedAt' | 'updatedAt'> & {
  subjectType: SessionSubjectType;
  subject: { id: Id; name: string; email?: string };
  current?: boolean;
};
