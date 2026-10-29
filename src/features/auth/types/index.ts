// Types for the sign-in routes (`/admin/auth/*`). The map names these routes but not their bodies, so the
// shapes below are the assumed contract of decision 006 (MISMATCHES M6); each lives in one place to change.
import type { Id, IsoDateTime } from '@/lib/api';

export type StaffStatus = 'invited' | 'active' | 'suspended';

/**
 * The signed-in staff member with their role and permissions, from `GET /admin/auth/me`
 * (assumed contract, decision 006).
 */
export type Me = {
  id: Id;
  email: string;
  name: string;
  status: StaffStatus;
  role: { id: Id; name: string };
  /** Permission strings such as `orders:read`, `staff:*` or `*`; see `@/lib/auth/permissions`. */
  permissions: string[];
  twofaEnabled: boolean;
  /** True while a temporary password must be replaced before anything else. */
  mustChangePassword: boolean;
  lastLoginAt: IsoDateTime | null;
  lastLoginIp: string | null;
};

/** Step 1 of sign-in (assumed contract, decision 006). */
export type LoginBody = { email: string; password: string };

/**
 * What step 1 answers: which screen comes next. `totp` asks for the authenticator code, `totp_setup` is the
 * first sign-in (scan a QR code first) and `password` means a temporary password must be replaced
 * (assumed contract, decision 006).
 */
export type LoginResult = { next: 'totp' | 'totp_setup' | 'password' };

/** Step 2 of sign-in: the 6-digit authenticator code (assumed contract, decision 006). */
export type TwoFactorBody = { code: string };

/**
 * The secret for first-time authenticator setup. `qrSvg` is a ready-made QR code image when the server sends
 * one (assumed contract, decision 006).
 */
export type TwoFactorSetup = { secret: string; otpauthUrl: string; qrSvg?: string };

/**
 * Chooses a password. `token` is the one-time token from an invite or reset link; without it the pre-2FA
 * session is used (temporary-password case). Assumed contract, decision 006.
 */
export type SetPasswordBody = { token?: string; password: string };
