import { getSupabase } from '@/lib/supabase';

// Anzeigename eines Benutzerkontos.
//
// Die fruehere Registrierung hat die E-Mail-Adresse als Namen gespeichert —
// bei allen Altkonten steht deshalb "x@gmail.com" im Feld name. Statt dann
// die E-Mail zu zeigen, wird der Name aus dem Mitgliedsantrag oder einer
// Formular-Anmeldung mit derselben E-Mail genommen. Die Datenbank bleibt
// dabei unveraendert; ein Admin kann den Namen auf der Benutzerseite
// dauerhaft eintragen.

export interface NamedUser {
  id: string;
  name: string | null;
  email: string | null;
}

// Ist im Namensfeld gar kein Name, sondern (wieder) die E-Mail?
export function hasRealName(user: { name?: string | null; email?: string | null }): boolean {
  const name = (user.name || '').trim();
  if (!name || name.includes('@')) return false;
  return name.toLowerCase() !== (user.email || '').trim().toLowerCase();
}

const fullName = (first?: unknown, last?: unknown) =>
  [first, last]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ');

// E-Mail (klein) -> voller Name aus Mitgliedsantraegen und Formular-Anmeldungen.
// Angenommene Antraege haben Vorrang vor offenen, Antraege vor Formularen.
export async function findNamesByEmail(emails: string[]): Promise<Map<string, string>> {
  const wanted = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  const result = new Map<string, string>();
  if (wanted.length === 0) return result;

  const supabase = getSupabase();

  try {
    const { data } = await supabase
      .from('membership_applications')
      .select('email, first_name, last_name, status')
      .in('email', wanted);
    const rank = (status: string) => (status === 'approved' ? 0 : status === 'pending' ? 1 : 2);
    for (const row of (data || []).sort((a, b) => rank(a.status) - rank(b.status))) {
      const email = String(row.email || '').toLowerCase();
      const name = fullName(row.first_name, row.last_name);
      if (email && name && !result.has(email)) result.set(email, name);
    }
  } catch {
    // Tabelle fehlt — dann eben ohne
  }

  const missing = wanted.filter((email) => !result.has(email));
  if (missing.length > 0) {
    try {
      const { data } = await supabase
        .from('form_submissions')
        .select('email, data, created_at')
        .in('email', missing)
        .order('created_at', { ascending: false });
      for (const row of data || []) {
        const email = String(row.email || '').toLowerCase();
        const values = (row.data || {}) as Record<string, unknown>;
        const name = fullName(values.first_name, values.last_name);
        if (email && name && !result.has(email)) result.set(email, name);
      }
    } catch {
      // Spalte email fehlt (event-registration.sql nicht eingespielt)
    }
  }

  return result;
}

// Ersetzt bei allen Benutzern ohne echten Namen das Namensfeld durch den
// gefundenen vollen Namen. Bleibt nichts uebrig, kommt die E-Mail zurueck.
// name_source sagt, woher der Name stammt (fuer die Admin-Ansicht).
export async function withDisplayNames<T extends NamedUser>(
  users: T[],
): Promise<(T & { name: string; name_source: 'account' | 'membership' | 'email' })[]> {
  const needLookup = users.filter((user) => !hasRealName(user) && user.email);
  const found = await findNamesByEmail(needLookup.map((user) => user.email as string));

  return users.map((user) => {
    if (hasRealName(user)) return { ...user, name: (user.name as string).trim(), name_source: 'account' as const };
    const fromRecords = user.email ? found.get(user.email.toLowerCase()) : undefined;
    if (fromRecords) return { ...user, name: fromRecords, name_source: 'membership' as const };
    return { ...user, name: user.email || '', name_source: 'email' as const };
  });
}

export async function displayNameOf(user: NamedUser | null | undefined): Promise<string> {
  if (!user) return '';
  const [resolved] = await withDisplayNames([user]);
  return resolved.name;
}

type TaskWithPeople = { assignee?: NamedUser | null; creator?: NamedUser | null };

// Aufgaben mit eingebetteter zustaendiger und erstellender Person: beide
// bekommen den Anzeigenamen. Eine Abfrage fuer alle Aufgaben zusammen.
// Generisch ohne Einschraenkung: Supabase typisiert eingebettete Zeilen als
// Liste, liefert bei n:1-Beziehungen aber ein einzelnes Objekt.
export async function withTaskPeopleNames<T>(rows: T[]): Promise<T[]> {
  const tasks = rows as unknown as TaskWithPeople[];
  const people = new Map<string, NamedUser>();
  for (const task of tasks) {
    if (task.assignee?.id) people.set(task.assignee.id, task.assignee);
    if (task.creator?.id) people.set(task.creator.id, task.creator);
  }
  const resolved = new Map((await withDisplayNames(Array.from(people.values()))).map((user) => [user.id, user]));
  const swap = (user: NamedUser | null | undefined) =>
    user?.id && resolved.has(user.id) ? { ...user, name: resolved.get(user.id)!.name } : user ?? null;
  return tasks.map((task) => ({ ...task, assignee: swap(task.assignee), creator: swap(task.creator) })) as unknown as T[];
}
