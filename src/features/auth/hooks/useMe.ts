// The signed-in staff member, read through Refine's identity (which the auth provider fills from `GET /admin/auth/me`).
import { useGetIdentity } from '@refinedev/core';
import type { Me } from '../types';

/** `data` is the current staff member (role and permissions included) once loaded. */
export function useMe() {
  return useGetIdentity<Me>();
}
