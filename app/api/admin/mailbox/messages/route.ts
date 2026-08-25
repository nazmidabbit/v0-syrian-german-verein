import { NextResponse } from 'next/server';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { mapEnvelopeAddresses, structureHasAttachments, withImap } from '@/lib/mailbox';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mailbox')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'INBOX';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const result = await withImap(async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const total = client.mailbox && typeof client.mailbox === 'object' ? client.mailbox.exists : 0;
        if (!total) {
          return { messages: [], total: 0 };
        }

        // Sequenzbereich der Seite: neueste Nachrichten haben die höchsten Sequenznummern
        const end = total - (page - 1) * PAGE_SIZE;
        const start = Math.max(1, end - PAGE_SIZE + 1);
        if (end < 1) {
          return { messages: [], total };
        }

        const messages: {
          uid: number;
          seq: number;
          subject: string;
          from: { name: string; address: string }[];
          to: { name: string; address: string }[];
          date: string | null;
          seen: boolean;
          answered: boolean;
          flagged: boolean;
          hasAttachments: boolean;
          size: number;
        }[] = [];

        for await (const msg of client.fetch(`${start}:${end}`, {
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
          size: true,
        })) {
          messages.push({
            uid: msg.uid,
            seq: msg.seq,
            subject: msg.envelope?.subject || '',
            from: mapEnvelopeAddresses(msg.envelope?.from),
            to: mapEnvelopeAddresses(msg.envelope?.to),
            date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
            seen: msg.flags?.has('\\Seen') ?? false,
            answered: msg.flags?.has('\\Answered') ?? false,
            flagged: msg.flags?.has('\\Flagged') ?? false,
            hasAttachments: structureHasAttachments(msg.bodyStructure),
            size: msg.size || 0,
          });
        }

        messages.sort((a, b) => b.seq - a.seq);
        return { messages, total };
      } finally {
        lock.release();
      }
    });

    return NextResponse.json({ ...result, page, pageSize: PAGE_SIZE });
  } catch (err) {
    console.error('Mailbox-Liste laden fehlgeschlagen:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'E-Mails konnten nicht geladen werden.' }, { status: 502 });
  }
}
