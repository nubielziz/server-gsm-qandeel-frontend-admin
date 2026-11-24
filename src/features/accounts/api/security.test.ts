// Tests for the staff security tools on an account, run against the dev mock API: each uses its route and body, and the mock keeps the
// Security part's facts in step and refuses what the server refuses (a guest, an account that is not active, two-step sign-in that is
// off, an email that is already verified). Ports the merchant security cases and the customer account actions that stayed.
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { noContent, SEED, spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import {
  getAccount,
  resendAccountVerification,
  resetAccountTwoFactor,
  revokeAccountSessions,
  setAccountPassword,
} from '.';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

const { ZAIN, INVITED, FORMER_PENDING, SUSPENDED_MERCHANT, DANIEL, SOFIA, HANNAH } = SEED;

describe('what each function sends', () => {
  it('uses the routes and bodies of the backend contract', async () => {
    const calls = [
      spy('post', `/admin/clients/${ZAIN}/password`, () => HttpResponse.json({ link: 'reset' })),
      spy('post', `/admin/clients/${ZAIN}/reset-2fa`, noContent),
      spy('post', `/admin/clients/${ZAIN}/sessions/revoke`, noContent),
      spy('post', `/admin/clients/${ZAIN}/verify-email/resend`, noContent),
    ];
    expect(await setAccountPassword(ZAIN, { mode: 'reset_link', revokeSessions: false })).toEqual({
      link: 'reset',
    });
    await resetAccountTwoFactor(ZAIN);
    await revokeAccountSessions(ZAIN);
    await resendAccountVerification(ZAIN);
    expect(calls[0][0]).toMatchObject({
      method: 'POST',
      body: { mode: 'reset_link', revokeSessions: false },
    });
    expect(calls[1][0]).toMatchObject({ method: 'POST', body: undefined });
    expect(calls[2][0]).toMatchObject({ method: 'POST', body: undefined });
    expect(calls[3][0]).toMatchObject({ method: 'POST', body: undefined });
  });
});

describe('passwords', () => {
  it('answers the link mode with which mail went out and the temporary mode with the password once', async () => {
    expect(await setAccountPassword(INVITED, { mode: 'reset_link', revokeSessions: false })).toEqual({
      link: 'invite',
    });
    expect(await setAccountPassword(ZAIN, { mode: 'reset_link', revokeSessions: false })).toEqual({
      link: 'reset',
    });
    const temporary = await setAccountPassword(ZAIN, { mode: 'temporary_password', revokeSessions: true });
    expect(temporary.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect(temporary.link).toBeUndefined();
    expect((await getAccount(ZAIN)).security).toMatchObject({ mustChangePassword: true, activeSessions: 0 });
  });

  it('sets or resets a shop account’s password with or without ending the sessions', async () => {
    const temporary = await setAccountPassword(DANIEL, { mode: 'temporary_password', revokeSessions: false });
    expect(temporary.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect((await getAccount(DANIEL)).security).toMatchObject({
      mustChangePassword: true,
      activeSessions: 1,
    });
    await setAccountPassword(DANIEL, { mode: 'reset_link', revokeSessions: true });
    expect((await getAccount(DANIEL)).security?.activeSessions).toBe(0);
  });

  it('refuses what the server refuses: a guest, an account that is not active, a mode that is not one', async () => {
    await expect(
      setAccountPassword(SOFIA, { mode: 'reset_link', revokeSessions: false }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'NO_ACCOUNT',
    });
    for (const id of [SUSPENDED_MERCHANT, HANNAH]) {
      await expect(
        setAccountPassword(id, { mode: 'reset_link', revokeSessions: false }),
      ).rejects.toMatchObject({
        status: 409,
        code: 'NOT_ACTIVE',
      });
    }
    await expect(
      setAccountPassword(9999, { mode: 'reset_link', revokeSessions: false }),
    ).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      setAccountPassword(ZAIN, { mode: 'nope' as never, revokeSessions: false }),
    ).rejects.toMatchObject({
      status: 422,
    });
  });
});

describe('two-step sign-in, sessions and verification', () => {
  it('turns two-step sign-in off and refuses a second time', async () => {
    await resetAccountTwoFactor(ZAIN);
    expect((await getAccount(ZAIN)).security).toMatchObject({ twofaEnabled: false, activeSessions: 0 });
    await expect(resetAccountTwoFactor(ZAIN)).rejects.toMatchObject({
      status: 409,
      code: 'TWOFA_NOT_ENABLED',
    });
    await expect(resetAccountTwoFactor(SOFIA)).rejects.toMatchObject({ status: 409, code: 'NO_ACCOUNT' });
  });

  it('signs an account out of every device, which drops the count of open sessions', async () => {
    expect((await getAccount(ZAIN)).security?.activeSessions).toBe(1);
    await revokeAccountSessions(ZAIN);
    expect((await getAccount(ZAIN)).security?.activeSessions).toBe(0);
    expect((await getAccount(DANIEL)).security?.activeSessions).toBe(1);
    await revokeAccountSessions(DANIEL);
    expect((await getAccount(DANIEL)).security?.activeSessions).toBe(0);
  });

  it('resends the verification link only for an active account whose email is not verified', async () => {
    await expect(resendAccountVerification(ZAIN)).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    await expect(resendAccountVerification(FORMER_PENDING)).rejects.toMatchObject({
      status: 409,
      code: 'NOT_ACTIVE',
    });
    await expect(resendAccountVerification(INVITED)).resolves.toBeUndefined();
    expect((await getAccount(INVITED)).security?.verificationSentAt).not.toBeNull();
  });
});
