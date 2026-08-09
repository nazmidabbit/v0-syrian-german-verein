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
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
  membershipType: string;
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
    `E-Mail: ${data.email}`,
    `Telefon: ${data.phone || '-'}`,
    `Adresse: ${data.street}, ${data.postalCode} ${data.city}`,
    `Beitragsart: ${data.membershipType}`,
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
