import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { buildMessageDetail, fetchParsedMessage, findSpecialFolder, withImap } from '@/lib/mailbox';

export const dynamic = 'force-dynamic';

function parseTarget(searchParams: URLSearchParams) {
  const folder = searchParams.get('folder') || '';
  const uid = Number(searchParams.get('uid'));
  if (!folder || !Number.isInteger(uid) || uid < 1) return null;
  return { folder, uid };
}

// Vollständige Nachricht laden und als gelesen markieren
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mailbox')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const target = parseTarget(new URL(request.url).searchParams);
    if (!target) {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const message = await withImap(async (client) => {
      const parsed = await fetchParsedMessage(client, target.folder, target.uid);
      if (!parsed) return null;

      const lock = await client.getMailboxLock(target.folder);
      try {
        await client.messageFlagsAdd(String(target.uid), ['\\Seen'], { uid: true });
      } finally {
        lock.release();
      }

      return buildMessageDetail(parsed, target.folder, target.uid);
    });

    if (!message) {
      return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
    }
    return NextResponse.json({ message });
  } catch (err) {
    console.error('Mailbox-Nachricht laden fehlgeschlagen:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Nachricht konnte nicht geladen werden.' }, { status: 502 });
  }
}

const patchSchema = z
  .object({
    folder: z.string().min(1),
    uid: z.number().int().positive(),
    seen: z.boolean(),
  })
  .strict();

// Gelesen-/Ungelesen-Status setzen
export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mailbox')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }
    const { folder, uid, seen } = parsed.data;

    await withImap(async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        if (seen) {
          await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        } else {
          await client.messageFlagsRemove(String(uid), ['\\Seen'], { uid: true });
        }
      } finally {
        lock.release();
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Mailbox-Flag setzen fehlgeschlagen:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Aktion fehlgeschlagen.' }, { status: 502 });
  }
}

// Löschen: in den Papierkorb verschieben; aus dem Papierkorb endgültig löschen
export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mailbox')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const target = parseTarget(new URL(request.url).searchParams);
    if (!target) {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const movedToTrash = await withImap(async (client) => {
      const trashPath = await findSpecialFolder(client, '\\Trash');
      const lock = await client.getMailboxLock(target.folder);
      try {
        if (trashPath && trashPath !== target.folder) {
          await client.messageMove(String(target.uid), trashPath, { uid: true });
          return true;
        }
        await client.messageDelete(String(target.uid), { uid: true });
        return false;
      } finally {
        lock.release();
      }
    });

    return NextResponse.json({ ok: true, movedToTrash });
  } catch (err) {
    console.error('Mailbox-Löschen fehlgeschlagen:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 502 });
  }
}
