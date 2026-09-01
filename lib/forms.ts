// Dynamischer Formular-Baukasten: Feldtypen, Basis-Feld-Katalog und
// serverseitige Validierung der Einsendungen.
// Wird von Client (Feld-Maske, oeffentliches Formular) und Server (API) genutzt.

export const FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'tel',
  'date',
  'number',
  'select',
  'checkbox',
  'photo',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text (einzeilig)',
  textarea: 'Text (mehrzeilig)',
  email: 'E-Mail',
  tel: 'Telefon',
  date: 'Datum',
  number: 'Zahl',
  select: 'Auswahl (Dropdown)',
  checkbox: 'Ankreuzfeld',
  photo: 'Foto (Bild-Upload)',
};

// Fotos kommen als Data-URL an (im Browser bereits verkleinert) und werden
// serverseitig in den Storage geschoben. SVG ist bewusst nicht erlaubt,
// weil darin Skripte stecken koennen.
export const PHOTO_DATA_URL_PATTERN = new RegExp('^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$');
export const MAX_PHOTO_DATA_URL_LENGTH = 3_500_000;

// Anmelde-Status einer Einsendung
export const SUBMISSION_STATUSES = ['confirmed', 'waitlist', 'cancelled'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  confirmed: 'Angemeldet',
  waitlist: 'Warteliste',
  cancelled: 'Storniert',
};

export interface FormFieldDef {
  id?: string;
  field_key: string;
  label: string;
  label_ar: string;
  field_type: FieldType;
  options: string[];
  options_ar: string[];
  required: boolean;
  sort_order: number;
}

// Vordefinierte Basis-Felder, die in der Feld-Maske per Klick
// uebernommen werden koennen (Labels zweisprachig DE/AR).
export const BASE_FIELDS: Omit<FormFieldDef, 'sort_order'>[] = [
  { field_key: 'first_name', label: 'Vorname', label_ar: 'الاسم', field_type: 'text', options: [], options_ar: [], required: true },
  { field_key: 'last_name', label: 'Nachname', label_ar: 'الكنية', field_type: 'text', options: [], options_ar: [], required: true },
  { field_key: 'birth_date', label: 'Geburtsdatum', label_ar: 'تاريخ الميلاد', field_type: 'date', options: [], options_ar: [], required: false },
  { field_key: 'email', label: 'E-Mail', label_ar: 'البريد الإلكتروني', field_type: 'email', options: [], options_ar: [], required: false },
  { field_key: 'phone', label: 'Telefon', label_ar: 'الهاتف', field_type: 'tel', options: [], options_ar: [], required: false },
  { field_key: 'street', label: 'Straße und Hausnummer', label_ar: 'الشارع ورقم المنزل', field_type: 'text', options: [], options_ar: [], required: false },
  { field_key: 'postal_code', label: 'PLZ', label_ar: 'الرمز البريدي', field_type: 'text', options: [], options_ar: [], required: false },
  { field_key: 'city', label: 'Ort', label_ar: 'المدينة', field_type: 'text', options: [], options_ar: [], required: false },
  { field_key: 'profession', label: 'Beruf', label_ar: 'المهنة', field_type: 'text', options: [], options_ar: [], required: false },
  { field_key: 'message', label: 'Nachricht', label_ar: 'رسالة', field_type: 'textarea', options: [], options_ar: [], required: false },
];

// Slug/Feldschluessel aus einem Titel erzeugen (Umlaute transliteriert,
// alles andere zu Bindestrich bzw. Unterstrich). Faellt auf Default zurueck,
// wenn nichts uebrig bleibt (z.B. rein arabischer Titel).
export function slugify(value: string, separator: '-' | '_' = '-', fallback = 'formular'): string {
  const slug = value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '')
    .slice(0, 60);
  return slug || fallback;
}

// Steuerzeichen wie in lib/membership.ts: einzeilig streng, mehrzeilig mit \n/\t
const NO_CONTROL_CHARS = new RegExp('^[^\\u0000-\\u001F\\u007F]*$');
const MULTILINE_SAFE = new RegExp('^[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]*$');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+0-9 ()/-]{5,25}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NUMBER_PATTERN = /^-?\d{1,12}([.,]\d{1,6})?$/;

const MAX_SINGLE_LINE = 300;
const MAX_MULTILINE = 2000;

export interface ValidationResult {
  ok: boolean;
  // Bereinigte Werte, nur bei ok === true belegt
  cleaned: Record<string, string | boolean>;
}

// Prueft eine Einsendung gegen die Felddefinitionen des Formulars.
// Unbekannte Schluessel fuehren zum Fehler (strict wie die zod-Schemata im Projekt).
export function validateSubmission(
  fields: Pick<FormFieldDef, 'field_key' | 'field_type' | 'options' | 'required'>[],
  data: Record<string, unknown>,
): ValidationResult {
  const known = new Set(fields.map((f) => f.field_key));
  for (const key of Object.keys(data)) {
    if (!known.has(key)) return { ok: false, cleaned: {} };
  }

  const cleaned: Record<string, string | boolean> = {};

  for (const field of fields) {
    const raw = data[field.field_key];

    if (field.field_type === 'checkbox') {
      if (raw !== undefined && typeof raw !== 'boolean') return { ok: false, cleaned: {} };
      const value = raw === true;
      if (field.required && !value) return { ok: false, cleaned: {} };
      cleaned[field.field_key] = value;
      continue;
    }

    // Foto vor der Text-Pruefung: kein trim/Steuerzeichen-Check auf mehreren
    // hundert KB Base64.
    if (field.field_type === 'photo') {
      if (raw !== undefined && typeof raw !== 'string') return { ok: false, cleaned: {} };
      const photo = raw ?? '';
      if (!photo) {
        if (field.required) return { ok: false, cleaned: {} };
        cleaned[field.field_key] = '';
        continue;
      }
      if (photo.length > MAX_PHOTO_DATA_URL_LENGTH || !PHOTO_DATA_URL_PATTERN.test(photo)) {
        return { ok: false, cleaned: {} };
      }
      cleaned[field.field_key] = photo;
      continue;
    }

    if (raw !== undefined && typeof raw !== 'string') return { ok: false, cleaned: {} };
    const value = (raw ?? '').trim();

    if (!value) {
      if (field.required) return { ok: false, cleaned: {} };
      cleaned[field.field_key] = '';
      continue;
    }

    const maxLength = field.field_type === 'textarea' ? MAX_MULTILINE : MAX_SINGLE_LINE;
    if (value.length > maxLength) return { ok: false, cleaned: {} };

    const safePattern = field.field_type === 'textarea' ? MULTILINE_SAFE : NO_CONTROL_CHARS;
    if (!safePattern.test(value)) return { ok: false, cleaned: {} };

    switch (field.field_type) {
      case 'email':
        if (!EMAIL_PATTERN.test(value) || value.length > 254) return { ok: false, cleaned: {} };
        break;
      case 'tel':
        if (!PHONE_PATTERN.test(value)) return { ok: false, cleaned: {} };
        break;
      case 'date':
        if (!DATE_PATTERN.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
          return { ok: false, cleaned: {} };
        }
        break;
      case 'number':
        if (!NUMBER_PATTERN.test(value)) return { ok: false, cleaned: {} };
        break;
      case 'select':
        if (!field.options.includes(value)) return { ok: false, cleaned: {} };
        break;
    }

    cleaned[field.field_key] = value;
  }

  return { ok: true, cleaned };
}
