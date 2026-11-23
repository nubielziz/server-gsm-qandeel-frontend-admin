// Tests for the delivery time of the Overview part: how minutes are shown as a number and a unit, and how a typed number and unit become minutes.
import { describe, expect, it } from 'vitest';
import {
  deliveryMinutes,
  deliveryOf,
  deliveryProblem,
  DELIVERY_UNITS,
  MAX_DELIVERY_MINUTES,
} from './delivery';

describe('deliveryOf', () => {
  it('shows the largest unit that holds the time exactly', () => {
    expect(deliveryOf(1440)).toEqual({ delivery: '1', unit: 'days' });
    expect(deliveryOf(4320)).toEqual({ delivery: '3', unit: 'days' });
    expect(deliveryOf(120)).toEqual({ delivery: '2', unit: 'hours' });
    expect(deliveryOf(90)).toEqual({ delivery: '90', unit: 'minutes' });
    expect(deliveryOf(1500)).toEqual({ delivery: '25', unit: 'hours' });
  });

  it('shows a short time in minutes', () => {
    expect(deliveryOf(5)).toEqual({ delivery: '5', unit: 'minutes' });
    expect(deliveryOf(1)).toEqual({ delivery: '1', unit: 'minutes' });
    expect(deliveryOf(60)).toEqual({ delivery: '1', unit: 'hours' });
  });
});

describe('deliveryMinutes', () => {
  it('turns a number and a unit into whole minutes', () => {
    expect(deliveryMinutes('90', 'minutes')).toBe(90);
    expect(deliveryMinutes('2', 'hours')).toBe(120);
    expect(deliveryMinutes(' 3 ', 'days')).toBe(4320);
  });

  it('is null for anything that is not a whole number of at least 1', () => {
    for (const text of ['', ' ', '0', '-5', '1.5', '2h', 'abc']) {
      expect(deliveryMinutes(text, 'minutes')).toBeNull();
    }
  });

  it('is null for a time longer than the API can store', () => {
    expect(deliveryMinutes(String(MAX_DELIVERY_MINUTES), 'minutes')).toBe(MAX_DELIVERY_MINUTES);
    expect(deliveryMinutes(String(MAX_DELIVERY_MINUTES), 'days')).toBeNull();
  });

  it('round-trips with deliveryOf', () => {
    for (const minutes of [1, 59, 60, 61, 1440, 1441, 2880, 100_000]) {
      const { delivery, unit } = deliveryOf(minutes);
      expect(deliveryMinutes(delivery, unit)).toBe(minutes);
    }
  });
});

describe('deliveryProblem', () => {
  it('is true for a good time', () => {
    expect(deliveryProblem('15', 'minutes')).toBe(true);
  });

  it('says what is wrong with a bad number, and with one that is too long', () => {
    expect(deliveryProblem('', 'minutes')).toBe('Enter a whole number, 1 or more.');
    expect(deliveryProblem('0', 'hours')).toBe('Enter a whole number, 1 or more.');
    expect(deliveryProblem('1.5', 'hours')).toBe('Enter a whole number, 1 or more.');
    expect(deliveryProblem(String(MAX_DELIVERY_MINUTES), 'days')).toBe(
      'That is longer than the system can store.',
    );
  });
});

describe('DELIVERY_UNITS', () => {
  it('lists minutes, hours and days in that order', () => {
    expect(DELIVERY_UNITS.map((unit) => unit.label)).toEqual(['Minutes', 'Hours', 'Days']);
  });
});
