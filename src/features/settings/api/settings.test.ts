// Tests for the settings API functions, run against the dev mock API.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { getSettings, updateSettings } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

describe('settings API', () => {
  it('reads the settings as one flat object, with the admin-console restriction on', async () => {
    const settings = await getSettings();
    expect(settings.adminAllowlistOnly).toBe(true);
    expect(typeof settings).toBe('object');
  });

  it('changes only the keys it is given', async () => {
    const before = await getSettings();
    const after = await updateSettings({ adminAllowlistOnly: false });
    expect(after).toEqual({ ...before, adminAllowlistOnly: false });
    expect((await getSettings()).adminAllowlistOnly).toBe(false);
  });
});
