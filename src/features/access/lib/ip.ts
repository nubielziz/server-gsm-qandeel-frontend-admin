// IPv4/IPv6 parsing and matching for the access screens. Ports IPV4, parseIp and ipIn of 14-state-access.js.
// They only power UX hints (shape, range width, "this includes your own address"): the server decides every rule.

/** Four dot-separated groups of one to three digits. */
export const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * The result of reading an address or range. An IPv4 range keeps its first address (`base`), its `mask` and the
 * prefix length (`bits`); `text` is the normalised form: the first address plus `/bits` (no suffix for one
 * address). IPv6 is only matched as exact text, in lower case.
 */
export type ParsedIp =
  | { error: string }
  | { v: 4; base: number; mask: number; bits: number; text: string }
  | { v: 6; text: string };

/** Reads what the user typed: `203.0.113.24`, `203.0.113.0/24` or an IPv6 address. Gives a plain-words error otherwise. */
export function parseIp(raw: unknown): ParsedIp {
  const input = String(raw ?? '').trim();
  if (!input) return { error: 'Enter an IP address or a range.' };
  const [addr, len, extra] = input.split('/');
  const match = IPV4.exec(addr);
  if (match && extra === undefined) {
    const octets = match.slice(1).map(Number);
    if (octets.some((n) => n > 255)) return { error: 'Each part of an IPv4 address is 0 to 255.' };
    let bits = 32;
    if (len !== undefined) {
      if (!/^\d{1,2}$/.test(len) || +len > 32) {
        return { error: 'The number after the slash is 0 to 32, like /24.' };
      }
      bits = +len;
    }
    const n = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
    // A shift by 32 does nothing in JavaScript, so a /0 mask has to be written out.
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    const base = (n & mask) >>> 0;
    const address = [base >>> 24, (base >>> 16) & 255, (base >>> 8) & 255, base & 255].join('.');
    return { v: 4, base, mask, bits, text: address + (bits === 32 ? '' : `/${bits}`) };
  }
  if (!match && /^[0-9a-f:]{3,39}$/i.test(addr) && addr.includes(':') && len === undefined) {
    return { v: 6, text: addr.toLowerCase() };
  }
  return { error: 'Enter an IPv4 address like 203.0.113.24, or a range like 203.0.113.0/24.' };
}

/** True when `parseIp` gave an error. */
export function isIpError(parsed: ParsedIp): parsed is { error: string } {
  return 'error' in parsed;
}

/**
 * Whether `ip` (an address, or the first address of a range) falls inside `rule` (an address or a range).
 * Different IP versions never match; IPv6 matches only the same address.
 */
export function ipIn(rule: string, ip: string): boolean {
  const r = parseIp(rule);
  const p = parseIp(ip);
  if (isIpError(r) || isIpError(p) || r.v !== p.v) return false;
  if (r.v === 6) return r.text === p.text;
  // p and r are both IPv4 here: the checks above leave no other case.
  return p.v === 4 && (p.base & r.mask) >>> 0 === r.base;
}
