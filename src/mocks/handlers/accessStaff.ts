// Mock of the admin account routes (`/admin/staff*`): list, show, add, edit, password, sign out everywhere, suspend,
// reactivate and 2FA reset. State changes are simple; the only refusals are the ones the map names (suspending
// yourself or the last Owner) plus an address already in use.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { PersonRef, StaffMember } from '@/features/access';
import type { Collection } from '../db';
import { latency } from '../latency';
import { problem } from '../problem';
import { roleStore } from '../roles';
import { currentStaff, guard } from '../session';
import { sessionStore, type MockSession } from '../sessions';
import { staffStore, type MockStaff } from '../staff';
import { bodyOf, invalid, notFound, readHandlers, textOf } from './accessShared';

/** The stores a staff answer is built from. */
export type StaffContext = { staff: Collection<MockStaff>; sessions: Collection<MockSession> };

export async function staffContext(): Promise<StaffContext> {
  const [staff, sessions] = await Promise.all([staffStore(), sessionStore()]);
  return { staff, sessions };
}

/** `{ id, name }` of a staff member, or null (the risk engine, a deleted account). */
export function personRef(staff: Collection<MockStaff>, id: number | null): PersonRef | null {
  const person = id === null ? undefined : staff.find(id);
  return person ? { id: person.id, name: person.name } : null;
}

/** The staff record as the API sends it: the role as an object, the people joined, the open sessions counted. */
export function toStaffMember(row: MockStaff, ctx: StaffContext): StaffMember {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: { id: row.roleId, name: roleStore().find(row.roleId)?.name ?? 'No role' },
    status: row.status,
    twofaEnabled: row.twofaEnabled,
    mustChangePassword: row.mustChangePassword,
    passwordChangedAt: row.passwordChangedAt,
    resetSentAt: row.resetSentAt,
    lastLoginAt: row.lastLoginAt,
    lastLoginIp: row.lastLoginIp,
    activeSessions: ctx.sessions
      .list()
      .filter((session) => session.subjectType === 'staff' && session.subject.id === row.id).length,
    createdAt: row.createdAt,
    createdBy: personRef(ctx.staff, row.createdBy),
    suspendedAt: row.suspendedAt,
    suspendedReason: row.suspendedReason,
    suspendedBy: personRef(ctx.staff, row.suspendedBy),
  };
}

// A password the way the server would generate one (the demo's alphabet, without look-alike characters).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function temporaryPassword(): string {
  return Array.from({ length: 14 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** Ends every session of one staff member; returns how many there were. */
function endSessions(ctx: StaffContext, staffId: number): number {
  const open = ctx.sessions
    .list()
    .filter((session) => session.subjectType === 'staff' && session.subject.id === staffId);
  open.forEach((session) => ctx.sessions.remove(session.id));
  return open.length;
}

type ActionResult = Response | Record<string, unknown> | void;

// `POST /admin/staff/:id/<suffix>`: finds the member, runs the change, answers 204 or the returned object.
function staffAction(
  suffix: string,
  apply: (
    member: MockStaff,
    ctx: StaffContext,
    body: Record<string, unknown>,
  ) => ActionResult | Promise<ActionResult>,
): HttpHandler {
  return http.post(`*/admin/staff/:id/${suffix}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const ctx = await staffContext();
    const member = ctx.staff.find(String(params.id));
    if (!member) return notFound('staff member', params.id);
    const result = await apply(member, ctx, await bodyOf(request));
    if (result instanceof Response) return result;
    return result ? HttpResponse.json(result) : new HttpResponse(null, { status: 204 });
  });
}

/** An address that another admin already uses (case does not matter). */
function emailTaken(ctx: StaffContext, email: string, exceptId?: number): boolean {
  return ctx.staff.list().some((other) => other.id !== exceptId && other.email.toLowerCase() === email);
}

export const staffHandlers: HttpHandler[] = [
  ...readHandlers({
    base: '/admin/staff',
    what: 'staff member',
    searchFields: ['name', 'email'],
    source: async () => {
      const ctx = await staffContext();
      return { rows: ctx.staff.list(), toDto: (row) => toStaffMember(row, ctx) };
    },
  }),

  // Add an admin: invited until the first sign-in, by link or with a temporary password the server makes up.
  http.post('*/admin/staff', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const ctx = await staffContext();
    const body = await bodyOf(request);
    const name = textOf(body.name).replace(/\s+/g, ' ');
    const email = textOf(body.email).toLowerCase();
    const roleId = Number(body.roleId);
    const errors = [
      ...(name.length < 2 ? [{ field: 'name', message: 'Enter their name.' }] : []),
      ...(EMAIL.test(email) ? [] : [{ field: 'email', message: 'Enter a valid email address.' }]),
      ...(roleStore().find(roleId) ? [] : [{ field: 'roleId', message: 'Choose a role.' }]),
    ];
    if (errors.length > 0) return invalid(errors);
    if (emailTaken(ctx, email)) {
      return problem(409, 'EMAIL_TAKEN', 'Email already in use', 'An admin with this email already exists.');
    }
    const temporary = body.onboarding === 'temporary_password';
    const now = new Date().toISOString();
    const row = ctx.staff.insert({
      email,
      name,
      status: 'invited',
      roleId,
      twofaEnabled: false,
      mustChangePassword: temporary,
      passwordChangedAt: temporary ? now : null,
      resetSentAt: temporary ? null : now,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: now,
      createdBy: (await currentStaff())?.id ?? null,
      suspendedAt: null,
      suspendedReason: null,
      suspendedBy: null,
    });
    const created = temporary
      ? { ...toStaffMember(row, ctx), temporaryPassword: temporaryPassword() }
      : toStaffMember(row, ctx);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch('*/admin/staff/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const ctx = await staffContext();
    const member = ctx.staff.find(String(params.id));
    if (!member) return notFound('staff member', params.id);
    const body = await bodyOf(request);
    const changes: Partial<MockStaff> = {};
    if (body.name !== undefined) changes.name = textOf(body.name).replace(/\s+/g, ' ');
    if (body.email !== undefined) changes.email = textOf(body.email).toLowerCase();
    if (body.roleId !== undefined) changes.roleId = Number(body.roleId);
    if (changes.email !== undefined && emailTaken(ctx, changes.email, member.id)) {
      return problem(409, 'EMAIL_TAKEN', 'Email already in use', 'Another admin already uses this email.');
    }
    ctx.staff.patch(member.id, changes);
    return HttpResponse.json(toStaffMember(member, ctx));
  }),

  // Replace the password: a set-password link, or a temporary password returned once.
  staffAction('password', (member, ctx, body) => {
    const now = new Date().toISOString();
    const temporary = body.mode === 'temporary_password';
    ctx.staff.patch(
      member.id,
      temporary
        ? { mustChangePassword: true, passwordChangedAt: now, resetSentAt: null }
        : { resetSentAt: now },
    );
    if (body.revokeSessions) endSessions(ctx, member.id);
    return temporary ? { temporaryPassword: temporaryPassword() } : {};
  }),

  staffAction('sessions/revoke', (member, ctx) => {
    endSessions(ctx, member.id);
  }),

  // The two refusals the map names: yourself, and the last active Owner.
  staffAction('suspend', async (member, ctx, body) => {
    const reason = textOf(body.reason);
    if (!reason) return invalid([{ field: 'reason', message: 'Say why, so the next person knows.' }]);
    if (member.id === (await currentStaff())?.id) {
      return problem(409, 'CANNOT_SUSPEND_SELF', 'Cannot suspend yourself', 'You cannot suspend yourself.');
    }
    if (member.status === 'suspended') {
      return problem(409, 'ALREADY_SUSPENDED', 'Already suspended', 'This account is already suspended.');
    }
    const ownerRole = roleStore()
      .list()
      .find((role) => role.name === 'Owner');
    const activeOwners = ctx.staff
      .list()
      .filter((other) => other.status === 'active' && other.roleId === ownerRole?.id);
    if (member.roleId === ownerRole?.id && activeOwners.length < 2) {
      return problem(
        409,
        'LAST_OWNER',
        'Last Owner',
        'There must always be one active Owner. Make someone else an Owner first.',
      );
    }
    endSessions(ctx, member.id);
    ctx.staff.patch(member.id, {
      status: 'suspended',
      suspendedAt: new Date().toISOString(),
      suspendedReason: reason,
      suspendedBy: (await currentStaff())?.id ?? null,
    });
  }),

  staffAction('reactivate', (member, ctx) => {
    ctx.staff.patch(member.id, {
      status: member.lastLoginAt ? 'active' : 'invited',
      suspendedAt: null,
      suspendedReason: null,
      suspendedBy: null,
    });
  }),

  // They set 2FA up again at the next sign-in, so their devices are signed out (the caller's own stay).
  staffAction('reset-2fa', async (member, ctx) => {
    ctx.staff.patch(member.id, { twofaEnabled: false });
    if (member.id !== (await currentStaff())?.id) endSessions(ctx, member.id);
  }),
];
