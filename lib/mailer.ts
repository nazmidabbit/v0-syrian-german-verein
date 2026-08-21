import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getTransporter() {
  const port = Number(process.env.SMTP_PORT);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Nutzereingaben duerfen nie unescaped in HTML-Mails landen
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify?token=${token}`;
  await transporter.sendMail({
    from: `"Syrisch-Deutscher Verein" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Bitte bestätigen Sie Ihre E-Mail - SYGS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Willkommen beim Syrisch-Deutschen Verein!</h2>
        <p>Vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den folgenden Link klicken:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            E-Mail bestätigen
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Nach der Bestätigung muss Ihr Konto noch vom Administrator freigegeben werden.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Syrisch-Deutscher Verein - sygs.de</p>
      </div>
    `,
  });
}

export interface MembershipMailData {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  email: string;
  phone: string;
  profession: string;
  certificate: string;
  street: string;
  postalCode: string;
  city: string;
  office: string;
  photoUrl: string;
  message: string;
}

// Benachrichtigung an den Vorstand — bewusst reine Text-Mail,
// damit Nutzereingaben kein HTML/JS einschleusen koennen.
export async function sendMembershipAdminNotification(data: MembershipMailData) {
  const to = process.env.MAIL_TO || 'info@sygs.de';
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const lines = [
    `Neuer Mitgliedsantrag über das Online-Formular:`,
    ``,
    `Name: ${data.firstName} ${data.lastName}`,
    `Geburtsdatum: ${data.birthDate}`,
    `Geburtsort: ${data.birthPlace || '-'}`,
    `E-Mail: ${data.email}`,
    `Telefon: ${data.phone || '-'}`,
    `Beruf: ${data.profession || '-'}`,
    `Abschluss/Qualifikation: ${data.certificate || '-'}`,
    `Adresse: ${data.street}, ${data.postalCode} ${data.city}`,
    `Wunsch-Büro: ${data.office || '-'}`,
    `Foto: ${data.photoUrl || '-'}`,
    ``,
    `Nachricht:`,
    data.message || '-',
    ``,
    `Antrag im Admin-Bereich prüfen: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://sygs.de'}/admin/mitgliedsantraege`,
  ];

  await getTransporter().sendMail({
    from: `"Mitgliedsantrag" <${from}>`,
    to,
    replyTo: data.email,
    subject: `Neuer Mitgliedsantrag: ${data.firstName} ${data.lastName}`,
    text: lines.join('\n'),
  });
}

// Mitgliedsnummer-Anzeigeformat, z.B. SYGS-0007
export function formatMemberNumber(num: number): string {
  return `SYGS-${String(num).padStart(4, '0')}`;
}

// Annahme-Bestaetigung an die Antragstellerin / den Antragsteller.
// Zweisprachig (DE + AR), da die Sprache des Antragstellers nicht gespeichert wird.
export async function sendMembershipApprovedEmail(email: string, firstName: string, memberNumber?: number | null) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const name = escapeHtml(firstName);
  const numberFormatted = memberNumber ? formatMemberNumber(memberNumber) : '';

  const numberBlockDe = numberFormatted
    ? `<p style="background: #f0f7ff; border: 1px solid #cde3ff; border-radius: 8px; padding: 12px 16px; font-size: 16px;">
         Ihre Mitgliedsnummer: <strong>${numberFormatted}</strong><br/>
         <span style="color: #666; font-size: 13px;">Bitte geben Sie diese Nummer bei Überweisungen und Anfragen an.</span>
       </p>`
    : '';
  const numberBlockAr = numberFormatted
    ? `<p style="background: #f0f7ff; border: 1px solid #cde3ff; border-radius: 8px; padding: 12px 16px; font-size: 16px;">
         رقم عضويتك: <strong dir="ltr">${numberFormatted}</strong><br/>
         <span style="color: #666; font-size: 13px;">يرجى ذكر هذا الرقم عند التحويلات البنكية وفي جميع المراسلات.</span>
       </p>`
    : '';

  await getTransporter().sendMail({
    from: `"Syrisch-Deutscher Verein" <${from}>`,
    to: email,
    subject: numberFormatted
      ? `Ihr Mitgliedsantrag wurde angenommen (${numberFormatted}) - SYGS`
      : 'Ihr Mitgliedsantrag wurde angenommen - SYGS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div dir="ltr">
          <h2 style="color: #333;">Hallo ${name},</h2>
          <p style="line-height: 1.6;">gute Nachrichten: Der Vorstand hat Ihren Mitgliedsantrag angenommen — herzlich willkommen in der Syrischen Gemeinschaft im Saarland!</p>
          ${numberBlockDe}
          <p style="line-height: 1.6;">Wir melden uns in Kürze mit allen weiteren Informationen zu Mitgliedsbeitrag und kommenden Veranstaltungen.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <div dir="rtl">
          <h2 style="color: #333;">مرحباً ${name}،</h2>
          <p style="line-height: 1.6;">خبر سار: وافق مجلس الإدارة على طلب انتسابك — أهلاً وسهلاً بك في تجمع السوريين في زارلاند!</p>
          ${numberBlockAr}
          <p style="line-height: 1.6;">سنتواصل معك قريباً بكل المعلومات حول رسوم العضوية والفعاليات القادمة.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Syrisch-Deutscher Verein - sygs.de</p>
      </div>
    `,
  });
}

// Eingangsbestaetigung fuer dynamische Formulare (Formular-Baukasten).
// Wird nur versendet, wenn das Formular ein E-Mail-Feld enthaelt.
export async function sendFormConfirmation(
  email: string,
  firstName: string,
  formTitle: string,
  locale: 'de' | 'ar',
) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const name = escapeHtml(firstName);
  const title = escapeHtml(formTitle);

  const isAr = locale === 'ar';
  const subject = isAr
    ? `استلمنا بياناتك: ${formTitle} - SYGS`
    : `Wir haben Ihre Angaben erhalten: ${formTitle} - SYGS`;
  const heading = isAr ? (name ? `مرحباً ${name}،` : 'مرحباً،') : name ? `Hallo ${name},` : 'Guten Tag,';
  const body = isAr
    ? `شكراً لك — لقد استلمنا بياناتك عبر استمارة «${title}» بنجاح. سنتواصل معك إذا لزم الأمر.`
    : `vielen Dank — wir haben Ihre Angaben über das Formular „${title}" erhalten. Falls nötig, melden wir uns bei Ihnen.`;

  await getTransporter().sendMail({
    from: `"Syrisch-Deutscher Verein" <${from}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;" dir="${isAr ? 'rtl' : 'ltr'}">
        <h2 style="color: #333;">${heading}</h2>
        <p style="line-height: 1.6;">${body}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Syrisch-Deutscher Verein - sygs.de</p>
      </div>
    `,
  });
}

// Eingangsbestaetigung an die Antragstellerin / den Antragsteller
export async function sendMembershipConfirmation(email: string, firstName: string, locale: 'de' | 'ar') {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const name = escapeHtml(firstName);

  const isAr = locale === 'ar';
  const subject = isAr
    ? 'استلمنا طلب انتسابك - SYGS'
    : 'Wir haben Ihren Mitgliedsantrag erhalten - SYGS';
  const heading = isAr ? `مرحباً ${name}،` : `Hallo ${name},`;
  const body = isAr
    ? 'شكراً لاهتمامك بالانضمام إلى تجمع السوريين في زارلاند. لقد استلمنا طلب انتسابك وسيقوم مجلس الإدارة بمراجعته. سنتواصل معك قريباً عبر البريد الإلكتروني.'
    : 'vielen Dank für Ihr Interesse an einer Mitgliedschaft in der Syrischen Gemeinschaft im Saarland. Wir haben Ihren Antrag erhalten — der Vorstand wird ihn prüfen und sich in Kürze per E-Mail bei Ihnen melden.';
  const note = isAr
    ? 'ملاحظة: الجمعية في طور التأسيس، وسيتم تفعيل العضوية الرسمية بعد التسجيل في سجل الجمعيات.'
    : 'Hinweis: Unser Verein befindet sich in der Gründungsphase. Die offizielle Mitgliedschaft wird nach Eintragung ins Vereinsregister wirksam.';

  await getTransporter().sendMail({
    from: `"Syrisch-Deutscher Verein" <${from}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;" dir="${isAr ? 'rtl' : 'ltr'}">
        <h2 style="color: #333;">${heading}</h2>
        <p style="line-height: 1.6;">${body}</p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">${note}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Syrisch-Deutscher Verein - sygs.de</p>
      </div>
    `,
  });
}
