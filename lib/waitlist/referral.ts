const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const REFERRAL_STORAGE_KEY = 'mistralfluence_referred_by';

export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizeReferralCode(rawCode?: string | null): string | null {
  if (!rawCode) {
    return null;
  }

  const cleaned = rawCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);

  return cleaned.length >= 4 ? cleaned : null;
}

export function generateReferralCode(length = REFERRAL_CODE_LENGTH): string {
  let code = '';

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * REFERRAL_CHARSET.length);
    code += REFERRAL_CHARSET[randomIndex];
  }

  return code;
}

export function buildReferralLink(siteUrl: string, referralCode: string): string {
  const url = new URL(siteUrl);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  url.searchParams.set('ref', referralCode);
  return url.toString();
}

export function getReferralFromSearch(search: string): string | null {
  const query = new URLSearchParams(search);
  return sanitizeReferralCode(query.get('ref'));
}
