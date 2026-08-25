import { NextResponse } from 'next/server';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { getMailAccount, withImap } from '@/lib/mailbox';

export const dynamic = 'force-dynamic';

// Sortierung: Posteingang zuerst, dann die bekannten Spezialordner, Rest alphabetisch
const SPECIAL_ORDER: Record<string, number> = {
  '\\Inbox': 0,
  '\\Sent': 1,
  '\\Drafts': 2,
  '\\Junk': 3,
  '\\Trash': 4,
};

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mailbox')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const folders = await withImap(async (client) => {
      const list = await client.list({ statusQuery: { messages: true, unseen: true } });
      return list
        .filter((f) => !f.flags?.has('\\Noselect'))
        .map((f) => ({
          path: f.path,
          name: f.name,
          specialUse: f.path.toUpperCase() === 'INBOX' ? '\\Inbox' : f.specialUse || '',
          messages: f.status?.messages ?? 0,
          unseen: f.status?.unseen ?? 0,
        }))
        .sort((a, b) => {
          const oa = SPECIAL_ORDER[a.specialUse] ?? 99;
          const ob = SPECIAL_ORDER[b.specialUse] ?? 99;
          if (oa !== ob) return oa - ob;
          return a.name.localeCompare(b.name);
        });
    });

    return NextResponse.json({ folders, account: getMailAccount().user });
  } catch (err) {
    console.error('Mailbox-Ordner laden fehlgeschlagen:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Verbindung zum Mailserver fehlgeschlagen.' }, { status: 502 });
  }
}
