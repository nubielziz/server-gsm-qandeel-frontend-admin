// Text helpers ported from the demo: masked email (13-b2c-ui.js), IMEI display and check digit (00-util.js).

/** Hides the middle of an address: "ja•••@example.com". */
export function maskEmail(email: string): string {
  return email.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
}

/** Groups a 15-digit IMEI as "35 123456 789012 3"; anything else is returned unchanged. */
export function fmtImei(imei: string): string {
  return /^\d{15}$/.test(imei) ? imei.replace(/^(\d{2})(\d{6})(\d{6})(\d)$/, '$1 $2 $3 $4') : imei;
}

/** Appends the Luhn check digit to the first 14 digits of an IMEI. */
export function luhn(base14: string): string {
  let total = 0;
  for (let i = 0; i < 14; i++) {
    let digit = Number(base14[13 - i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
  }
  return base14 + ((10 - (total % 10)) % 10);
}
