// Mock of the role routes (`/admin/roles*`) and the permission list (`/admin/permissions`). Simple state changes; a
// role that staff still hold cannot be deleted, so no account is left pointing at a role that no longer exists.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Role } from '@/features/access';
import { latency } from '../latency';
import { problem } from '../problem';
import { PERMISSION_CATALOG, roleStore, type MockRole } from '../roles';
import { guard } from '../session';
import { staffStore } from '../staff';
import { bodyOf, invalid, notFound, readHandlers, textOf } from './accessShared';

const permissionList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const roleHandlers: HttpHandler[] = [
  ...readHandlers({
    base: '/admin/roles',
    what: 'role',
    searchFields: ['name'],
    source: async () => {
      const staff = (await staffStore()).list();
      return {
        rows: roleStore().list(),
        toDto: (row: MockRole): Role => ({
          ...row,
          staffCount: staff.filter((member) => member.roleId === row.id).length,
        }),
      };
    },
  }),

  http.post('*/admin/roles', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const body = await bodyOf(request);
    const name = textOf(body.name);
    if (!name) return invalid([{ field: 'name', message: 'Enter a role name.' }]);
    const role = roleStore().insert({ name, permissions: permissionList(body.permissions) });
    return HttpResponse.json({ ...role, staffCount: 0 }, { status: 201 });
  }),

  http.patch('*/admin/roles/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const body = await bodyOf(request);
    const changes: Partial<MockRole> = {};
    if (body.name !== undefined) changes.name = textOf(body.name);
    if (body.permissions !== undefined) changes.permissions = permissionList(body.permissions);
    const role = roleStore().patch(String(params.id), changes);
    return role ? HttpResponse.json(role) : notFound('role', params.id);
  }),

  http.delete('*/admin/roles/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const role = roleStore().find(String(params.id));
    if (!role) return notFound('role', params.id);
    const holders = (await staffStore()).list().filter((member) => member.roleId === role.id).length;
    if (holders > 0) {
      return problem(
        409,
        'ROLE_IN_USE',
        'Role in use',
        `${holders} ${holders === 1 ? 'admin still has' : 'admins still have'} this role. Give them another role first.`,
      );
    }
    roleStore().remove(role.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/admin/permissions', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return HttpResponse.json(PERMISSION_CATALOG);
  }),
];
