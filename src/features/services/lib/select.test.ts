// Tests for the menu helper that keeps a chosen value visible while its name has not loaded.
import { describe, expect, it } from 'vitest';
import { withChosen } from './select';

const options = [
  { value: '', label: 'Choose' },
  { value: 4, label: 'Four' },
];

describe('withChosen', () => {
  it('leaves the options alone when the choice is in them, whether it is a number or its text', () => {
    expect(withChosen(options, 4, 'Category 4')).toEqual(options);
    expect(withChosen(options, '4', 'Category 4')).toEqual(options);
  });

  it('adds the choice when the list does not hold it', () => {
    expect(withChosen(options, 9, 'Category 9')).toEqual([...options, { value: 9, label: 'Category 9' }]);
  });

  it('adds nothing for no choice', () => {
    expect(withChosen(options, '', 'x')).toEqual(options);
    expect(withChosen(options, null, 'x')).toEqual(options);
    expect(withChosen(options, undefined, 'x')).toEqual(options);
  });
});
