import { NextResponse } from 'next/server';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { fetchParsedMessage, withImap } from '@/lib/mailbox';

export const dynamic = 'force-dynamic';

// Einzelnen Anhang einer Nachricht herunterladen
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mailbox')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || '';
    const uid = Number(searchParams.get('uid'));
    const index = Number(searchParams.get('index'));
    if (!folder || !Number.isInteger(uid) || uid < 1 || !Number.isInteger(index) || index < 0) {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const attachment = await withImap(async (client) => {
      const parsed = await fetchParsedMessage(client, folder, uid);
      return parsed?.attachments?.[index] || null;
    });

    if (!attachment || !attachment.content) {
      return NextResponse.json({ error: 'Anhang nicht gefunden.' }, { status: 404 });
    }

    const filename = attachment.filename || `anhang-${index + 1}`;
    // RFC 5987-Encoding, damit auch Umlaute/arabische Dateinamen funktionieren
    const encodedName = encodeURIComponent(filename).replace(/'/g, '%27');

    return new NextResponse(new Uint8Array(attachment.content), {
      headers: {
        'Content-Type': attachment.contentType || 'application/octet-stream',
        'Content-Length': String(attachment.content.length),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Mailbox-Anhang laden fehlgeschlagen:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Anhang konnte nicht geladen werden.' }, { status: 502 });
  }
}
