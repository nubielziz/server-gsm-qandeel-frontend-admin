// The identifier the real server makes from a name (backend decision 077, `src/common/identifier.ts`): the code of a payment method and the
// key of an alert rule. One helper for the mocks of both, so they cannot drift from the server. Mocks fake answers only (decision 014).

/** The shape a made identifier must have: the same three rules the server's maker takes. */
export interface IdentifierRules {
  /** The longest identifier, any suffix included. */
  readonly maxLength: number;
  /** What a name with nothing usable in it becomes, and the word put in front (`<fallback>_`) when the shape rules below need it. */
  readonly fallback: string;
  /** The shortest identifier; a shorter result is put behind `<fallback>_`. Default 1. */
  readonly minLength?: number;
  /** True when the identifier must start with a letter: a result that starts with a digit is put behind `<fallback>_`. Default false. */
  readonly startsWithLetter?: boolean;
}

// The Latin letters that do not fall apart into a letter and an accent when a text is decomposed: ss, ae, oe, o, l, d, d (as escapes).
const LATIN_LETTERS: Readonly<Record<string, string>> = {
  '\u00df': 'ss',
  '\u00e6': 'ae',
  '\u0153': 'oe',
  '\u00f8': 'o',
  '\u0142': 'l',
  '\u0111': 'd',
  '\u00f0': 'd',
};

/** The most tries before the helper gives up, as the server's (a bug or a flood, never a real list of names). */
const MAX_ATTEMPTS = 1000;

/**
 * Turns a name into an identifier exactly as the server does: decomposed (NFKD) with the accent marks dropped, the special Latin letters
 * spelled out, lower case, every run of characters outside a-z and 0-9 one underscore, none at either end. A name with nothing usable
 * in it is the fallback; a result that starts with a digit (when the rules ask for a letter first) or is too short is put behind
 * `<fallback>_`. The result is cut to the longest length with no underscore left at the end.
 */
export function identifierFrom(text: string, rules: IdentifierRules): string {
  const plain = text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\u00df\u00e6\u0153\u00f8\u0142\u0111\u00f0]/g, (letter) => LATIN_LETTERS[letter] ?? letter);
  let made = plain.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (made === '') made = rules.fallback;
  else if ((rules.startsWithLetter === true && /^[0-9]/.test(made)) || made.length < (rules.minLength ?? 1)) {
    made = `${rules.fallback}_${made}`;
  }
  return made.slice(0, rules.maxLength).replace(/_+$/, '');
}

/**
 * The identifier to try on the given attempt, counted from 1: `base` itself, then `base_2`, `base_3`. The base is cut so that the suffix
 * always fits the longest length.
 */
export function identifierAttempt(base: string, attempt: number, maxLength: number): string {
  if (attempt <= 1) return base.slice(0, maxLength).replace(/_+$/, '');
  const suffix = `_${attempt}`;
  return `${base.slice(0, maxLength - suffix.length).replace(/_+$/, '')}${suffix}`;
}

/** The first identifier from `base` that `taken` does not report as held: `base`, `base_2`, `base_3`, ... (the server does the same with its rows). */
export function firstFreeIdentifier(
  base: string,
  maxLength: number,
  taken: (candidate: string) => boolean,
): string {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const candidate = identifierAttempt(base, attempt, maxLength);
    if (!taken(candidate)) return candidate;
  }
  throw new Error(`No free identifier was found from "${base}" in ${MAX_ATTEMPTS} tries.`);
}
