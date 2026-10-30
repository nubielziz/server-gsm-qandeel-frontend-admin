// Tests for clearWhenFixed: the wrapped registration still updates the form, and clears the error only on a fix.
import { describe, expect, it, vi } from 'vitest';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { clearWhenFixed } from './clearWhenFixed';

function registration(): UseFormRegisterReturn<'email'> {
  return { name: 'email', onChange: vi.fn(async () => true), onBlur: vi.fn(async () => true), ref: vi.fn() };
}

describe('clearWhenFixed', () => {
  it('passes every change on, and clears only when the new value is fixed', async () => {
    const base = registration();
    const clear = vi.fn();
    const wrapped = clearWhenFixed(base, (value) => value.includes('@'), clear);
    expect(wrapped.name).toBe('email');
    expect(wrapped.onBlur).toBe(base.onBlur);

    await wrapped.onChange({ target: { value: 'rami' }, type: 'change' });
    expect(base.onChange).toHaveBeenCalledTimes(1);
    expect(clear).not.toHaveBeenCalled();

    await wrapped.onChange({ target: { value: 'rami@gsm-supply.example' }, type: 'change' });
    expect(base.onChange).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
