// Test fixtures for the access feature: one valid staff member and role, changed per test.
import type { Role, StaffMember } from '@/features/access';

export function member(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 1,
    name: 'Rami K.',
    email: 'rami@gsm-supply.example',
    role: { id: 1, name: 'Owner' },
    status: 'active',
    twofaEnabled: true,
    mustChangePassword: false,
    passwordChangedAt: '2025-11-01T12:00:00.000Z',
    lastLoginAt: '2026-01-01T11:50:00.000Z',
    lastLoginIp: '203.0.113.24',
    activeSessions: 1,
    createdAt: '2025-11-26T12:00:00.000Z',
    createdBy: null,
    suspendedAt: null,
    suspendedReason: null,
    suspendedBy: null,
    ...overrides,
  };
}

export function role(overrides: Partial<Role> = {}): Role {
  return { id: 1, name: 'Owner', permissions: ['*'], ...overrides };
}
