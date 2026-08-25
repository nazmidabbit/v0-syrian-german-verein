import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail, type AddressObject } from 'mailparser';

// IMAP-Zugang: eigene IMAP_*-Variablen, sonst Fallback auf die SMTP-Zugangsdaten
// (bei IONOS sind Benutzer/Passwort für SMTP und IMAP identisch).
export function getMailAccount() {
  return {
    host: process.env.IMAP_HOST || 'imap.ionos.de',
    port: Number(process.env.IMAP_PORT || 993),
    user: process.env.IMAP_USER || process.env.SMTP_USER || '',
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS || '',
  };
}

export async function withImap<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const account = getMailAccount();
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.port === 993,
    auth: { user: account.user, pass: account.pass },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

// Namens-Heuristik als Fallback, falls der Server kein SPECIAL-USE meldet
const SPECIAL_NAME_HINTS: Record<string, string[]> = {
  '\\Sent': ['sent', 'gesendet'],
  '\\Trash': ['trash', 'papierkorb', 'deleted', 'gelöscht', 'geloescht'],
  '\\Drafts': ['draft', 'entwurf', 'entwürfe', 'entwuerfe'],
  '\\Junk': ['junk', 'spam'],
};

export async function findSpecialFolder(client: ImapFlow, use: string): Promise<string | null> {
  const folders = await client.list();
  const byUse = folders.find((f) => f.specialUse === use);
  if (byUse) return byUse.path;

  const hints = SPECIAL_NAME_HINTS[use] || [];
  const byName = folders.find((f) => hints.some((h) => f.path.toLowerCase().includes(h)));
  return byName?.path || null;
}

export interface MailAddress {
  name: string;
  address: string;
}

export function mapEnvelopeAddresses(list?: { name?: string; address?: string }[]): MailAddress[] {
  return (list || [])
    .filter((a) => a.address)
    .map((a) => ({ name: a.name || '', address: a.address || '' }));
}

function mapParsedAddresses(addr?: AddressObject | AddressObject[]): MailAddress[] {
  const objects = Array.isArray(addr) ? addr : addr ? [addr] : [];
  return objects.flatMap((o) =>
    (o.value || [])
      .filter((v) => v.address)
      .map((v) => ({ name: v.name || '', address: v.address || '' })),
  );
}

// Erkennung "hat Anhänge" anhand der Body-Struktur (ohne die Mail herunterzuladen)
export function structureHasAttachments(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const n = node as { disposition?: string; childNodes?: unknown[] };
  if (n.disposition && n.disposition.toLowerCase() === 'attachment') return true;
  return (n.childNodes || []).some((child) => structureHasAttachments(child));
}

// Rohe Mail per UID laden und parsen
export async function fetchParsedMessage(client: ImapFlow, folder: string, uid: number): Promise<ParsedMail | null> {
  const lock = await client.getMailboxLock(folder);
  try {
    const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (!msg || !msg.source) return null;
    return await simpleParser(msg.source);
  } finally {
    lock.release();
  }
}

// Script-fähige Elemente serverseitig entfernen — zusätzlich rendert der Client
// die Mail nur in einem Sandbox-iframe ohne Script-Ausführung.
export function stripActiveHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<(iframe|object|embed|applet|form)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(iframe|object|embed|applet|form|base|meta|link)\b[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');
}

// Inline-Bilder (cid:...) als data-URIs einbetten, damit sie im iframe angezeigt werden
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

export function embedInlineImages(html: string, parsed: ParsedMail): string {
  let result = html;
  for (const att of parsed.attachments || []) {
    if (!att.cid || !att.contentType?.startsWith('image/')) continue;
    if (!att.content || att.content.length > MAX_INLINE_IMAGE_BYTES) continue;
    const dataUri = `data:${att.contentType};base64,${att.content.toString('base64')}`;
    result = result.split(`cid:${att.cid}`).join(dataUri);
  }
  return result;
}

export interface MessageDetail {
  uid: number;
  folder: string;
  subject: string;
  from: MailAddress[];
  to: MailAddress[];
  cc: MailAddress[];
  replyTo: MailAddress[];
  date: string | null;
  messageId: string;
  references: string;
  html: string;
  text: string;
  attachments: { index: number; filename: string; contentType: string; size: number }[];
}

export function buildMessageDetail(parsed: ParsedMail, folder: string, uid: number): MessageDetail {
  const rawHtml = parsed.html || parsed.textAsHtml || '';
  const html = rawHtml ? embedInlineImages(stripActiveHtml(rawHtml), parsed) : '';

  const references = Array.isArray(parsed.references)
    ? parsed.references.join(' ')
    : parsed.references || '';

  // Nur echte Anhänge listen — Inline-Bilder sind bereits im HTML eingebettet
  const attachments = (parsed.attachments || [])
    .map((att, index) => ({ att, index }))
    .filter(({ att }) => !(att.cid && att.contentDisposition !== 'attachment'))
    .map(({ att, index }) => ({
      index,
      filename: att.filename || `anhang-${index + 1}`,
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || att.content?.length || 0,
    }));

  return {
    uid,
    folder,
    subject: parsed.subject || '',
    from: mapParsedAddresses(parsed.from),
    to: mapParsedAddresses(parsed.to),
    cc: mapParsedAddresses(parsed.cc),
    replyTo: mapParsedAddresses(parsed.replyTo),
    date: parsed.date ? parsed.date.toISOString() : null,
    messageId: parsed.messageId || '',
    references,
    html,
    text: parsed.text || '',
    attachments,
  };
}
