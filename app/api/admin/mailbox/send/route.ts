import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { getTransporter } from '@/lib/mailer';
import { fetchParsedMessage, findSpecialFolder, withImap } from '@/lib/mailbox';

export const dynamic = 'force-dynamic';

const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "a@b.de, C <c@d.de>; e@f.de" → validierte Adressliste
function parseRecipients(raw: string): string[] | null {
  const parts = raw
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    const match = part.match(/<([^>]+)>\s*$/);
    const address = (match ? match[1] : part).trim();
    if (!EMAIL_RE.test(address)) return null;
    result.push(match ? part : address);
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mailbox')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const form = await request.formData();
    const getField = (name: string) => {
      const value = form.get(name);
      return typeof value === 'string' ? value.trim() : '';
    };

    const to = parseRecipients(getField('to'));
    if (!to || to.length === 0) {
      return NextResponse.json({ error: 'Bitte mindestens einen gültigen Empfänger angeben.' }, { status: 400 });
    }
    const cc = getField('cc') ? parseRecipients(getField('cc')) : [];
    const bcc = getField('bcc') ? parseRecipients(getField('bcc')) : [];
    if (cc === null || bcc === null) {
      return NextResponse.json({ error: 'Ungültige Adresse in CC/BCC.' }, { status: 400 });
    }

    const subject = getField('subject');
    const text = getField('text');
    if (!subject && !text) {
      return NextResponse.json({ error: 'Bitte Betreff oder Nachrichtentext angeben.' }, { status: 400 });
    }

    const inReplyTo = getField('inReplyTo');
    const references = getField('references');
    const forwardFolder = getField('forwardFolder');
    const forwardUid = Number(getField('forwardUid')) || 0;
    const replyFolder = getField('replyFolder');
    const replyUid = Number(getField('replyUid')) || 0;

    // Hochgeladene Anhänge übernehmen
    const attachments: Attachment[] = [];
    let totalBytes = 0;
    for (const entry of form.getAll('files')) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      totalBytes += entry.size;
      if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
        return NextResponse.json({ error: 'Anhänge zu groß (max. 25 MB insgesamt).' }, { status: 400 });
      }
      attachments.push({
        filename: entry.name || 'anhang',
        content: Buffer.from(await entry.arrayBuffer()),
        contentType: entry.type || undefined,
      });
    }

    // Beim Weiterleiten die Original-Anhänge mitnehmen
    if (forwardFolder && forwardUid > 0) {
      const original = await withImap((client) => fetchParsedMessage(client, forwardFolder, forwardUid));
      for (const att of original?.attachments || []) {
        if (!att.content) continue;
        totalBytes += att.content.length;
        if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
          return NextResponse.json({ error: 'Original-Anhänge zu groß zum Weiterleiten (max. 25 MB).' }, { status: 400 });
        }
        attachments.push({
          filename: att.filename || 'anhang',
          content: att.content,
          contentType: att.contentType || undefined,
          cid: att.cid || undefined,
        });
      }
    }

    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || '';
    const mailOptions = {
      from: `"Syrisch-Deutscher Verein" <${fromAddress}>`,
      to: to.join(', '),
      cc: cc.length ? cc.join(', ') : undefined,
      bcc: bcc.length ? bcc.join(', ') : undefined,
      subject,
      text,
      attachments: attachments.length ? attachments : undefined,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
    };

    const info = await getTransporter().sendMail(mailOptions);

    // Kopie in "Gesendet" ablegen und ggf. Original als beantwortet markieren.
    // Beides ist Komfort — ein Fehler hier darf den erfolgreichen Versand nicht verdecken.
    let sentCopySaved = false;
    try {
      const composed = await nodemailer
        .createTransport({ streamTransport: true, buffer: true })
        .sendMail({ ...mailOptions, messageId: info.messageId });
      const raw = composed.message as Buffer;

      await withImap(async (client) => {
        const sentPath = await findSpecialFolder(client, '\\Sent');
        if (sentPath) {
          await client.append(sentPath, raw, ['\\Seen']);
          sentCopySaved = true;
        }
        if (replyFolder && replyUid > 0) {
          const lock = await client.getMailboxLock(replyFolder);
          try {
            await client.messageFlagsAdd(String(replyUid), ['\\Answered'], { uid: true });
          } finally {
            lock.release();
          }
        }
      });
    } catch (err) {
      console.error('Gesendet-Kopie ablegen fehlgeschlagen:', err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ ok: true, sentCopySaved });
  } catch (err) {
    console.error('Mail-Versand fehlgeschlagen:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden.' }, { status: 502 });
  }
}
