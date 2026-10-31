// Tests for `isMonitoringUnavailable`: only a 503 with the monitoring code counts.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { isMonitoringUnavailable } from './monitoring';

describe('isMonitoringUnavailable', () => {
  it('is true for a 503 with the code MONITORING_UNAVAILABLE', () => {
    expect(isMonitoringUnavailable(new ApiError({ status: 503, code: 'MONITORING_UNAVAILABLE' }))).toBe(true);
  });

  it('is false for another 503, such as the database being down', () => {
    expect(isMonitoringUnavailable(new ApiError({ status: 503, code: 'DATABASE_UNAVAILABLE' }))).toBe(false);
  });

  it('is false for the same code on another status', () => {
    expect(isMonitoringUnavailable(new ApiError({ status: 500, code: 'MONITORING_UNAVAILABLE' }))).toBe(
      false,
    );
  });

  it('is false for a network failure, a 403 and things that are not errors of the API', () => {
    expect(isMonitoringUnavailable(new ApiError({ status: 0, code: 'NETWORK_ERROR' }))).toBe(false);
    expect(isMonitoringUnavailable(new ApiError({ status: 403, code: 'FORBIDDEN' }))).toBe(false);
    expect(isMonitoringUnavailable(new Error('MONITORING_UNAVAILABLE'))).toBe(false);
    expect(isMonitoringUnavailable(undefined)).toBe(false);
    expect(isMonitoringUnavailable(null)).toBe(false);
  });
});
