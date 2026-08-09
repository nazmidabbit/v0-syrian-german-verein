import crypto from 'crypto';

// HMAC-signierter Zeitstempel als Formular-Token:
// - Bots, die das Formular sofort abschicken, scheitern am Mindestalter.
// - Abgelaufene/gefaelschte Tokens werden abgelehnt.
// Nur serverseitig verwenden (node:crypto).

const SECRET =
  process.env.FORM_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!SECRET) {
  console.warn('FORM_TOKEN_SECRET/JWT_SECRET ist nicht gesetzt. Bitte in .env definieren.');
}

function sign(value: string): string {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

export function issueFormToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function verifyFormToken(token: string, minAgeMs = 3_000, maxAgeMs = 2 * 3600_000): boolean {
  const dot = token.indexOf('.');
  if (dot <= 0) return false;

  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d{10,16}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return false;

  const expected = sign(ts);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const age = Date.now() - Number(ts);
  return age >= minAgeMs && age <= maxAgeMs;
}

// DSGVO-schonend: IP nie im Klartext speichern, nur gesalzener Hash
export function hashIp(ip: string): string {
  return crypto.createHmac('sha256', `ip:${SECRET}`).update(ip).digest('hex').slice(0, 32);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
