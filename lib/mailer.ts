import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
