import { z } from 'zod';

// Gemeinsames Schema fuer Client (react-hook-form) und Server (API-Route).
// Fehlermeldungen sind i18n-Schluessel, die der Client uebersetzt.

// Beitragsart: 5 € monatlich oder 60 € jaehrlich.
// Wird derzeit NICHT im Formular abgefragt — kommt zurueck, sobald das
// Vereinskonto (IBAN) existiert. Enum bleibt fuer Bestandsdaten/Admin erhalten.
export const MEMBERSHIP_TYPES = ['monthly', 'yearly'] as const;
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

// Steuerzeichen (inkl. CR/LF) sind in einzeiligen Feldern nie legitim —
// verhindert u.a. E-Mail-Header-Injection.
const NO_CONTROL_CHARS = new RegExp('^[^\\u0000-\\u001F\\u007F]*$');

// Mehrzeilig: Zeilenumbrueche und Tab erlaubt, sonstige Steuerzeichen nicht.
const MULTILINE_SAFE = new RegExp('^[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]*$');

const singleLine = (min: number, max: number) =>
  z
    .string({ required_error: 'required' })
    .trim()
    .min(min, 'tooShort')
    .max(max, 'tooLong')
    .regex(NO_CONTROL_CHARS, 'invalid');

export const membershipFormSchema = z
  .object({
    firstName: singleLine(2, 100),
    lastName: singleLine(2, 100),
    birthDate: z
      .string({ required_error: 'required' })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalidDate')
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return false;
        const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
        return age >= 16 && age <= 120;
      }, 'invalidBirthDate'),
    email: z
      .string({ required_error: 'required' })
      .trim()
      .toLowerCase()
      .email('invalidEmail')
      .max(254, 'tooLong'),
    phone: z
      .string()
      .trim()
      .max(25, 'tooLong')
      .regex(/^$|^[+0-9 ()/-]{5,25}$/, 'invalidPhone')
      .optional()
      .default(''),
    birthPlace: z
      .string()
      .trim()
      .max(100, 'tooLong')
      .regex(NO_CONTROL_CHARS, 'invalid')
      .optional()
      .default(''),
    profession: z
      .string()
      .trim()
      .max(100, 'tooLong')
      .regex(NO_CONTROL_CHARS, 'invalid')
      .optional()
      .default(''),
    certificate: z
      .string()
      .trim()
      .max(150, 'tooLong')
      .regex(NO_CONTROL_CHARS, 'invalid')
      .optional()
      .default(''),
    street: singleLine(3, 150),
    postalCode: z
      .string({ required_error: 'required' })
      .trim()
      .regex(/^[0-9]{4,5}$/, 'invalidPostalCode'),
    city: singleLine(2, 100),
    // Wunsch-Buero (optional) — UUID aus der Stammdaten-Tabelle offices
    officeId: z
      .string()
      .trim()
      .regex(/^$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'invalid')
      .optional()
      .default(''),
    message: z
      .string()
      .trim()
      .max(2000, 'tooLong')
      .regex(MULTILINE_SAFE, 'invalid')
      .optional()
      .default(''),
    privacyConsent: z.boolean().refine((v) => v === true, 'consentRequired'),
    statutesConsent: z.boolean().refine((v) => v === true, 'consentRequired'),
  })
  .strict();

export type MembershipFormValues = z.infer<typeof membershipFormSchema>;

// Was der Server zusaetzlich erwartet: Anti-Bot-Token + Honeypot + Foto.
export const membershipSubmitSchema = membershipFormSchema.extend({
  formToken: z.string().min(1).max(200),
  // Honeypot — muss leer sein; wird serverseitig gesondert behandelt
  company: z.string().max(200).optional().default(''),
  locale: z.enum(['de', 'ar']).optional().default('de'),
  // Foto als Data-URL (client-seitig verkleinert); leer = kein Foto.
  // ~2,8 Mio Base64-Zeichen entsprechen ca. 2 MB Bilddaten.
  photo: z
    .string()
    .max(2_800_000, 'tooLong')
    .regex(/^$|^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'invalid')
    .optional()
    .default(''),
});

export type MembershipSubmitValues = z.infer<typeof membershipSubmitSchema>;
