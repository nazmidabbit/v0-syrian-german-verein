import nodemailer from "nodemailer"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { firstName, lastName, email, subject, message } = req.body || {}

  if (!email || !subject || !message) {
    return res.status(400).json({ success: false, error: "E-Mail, Betreff und Nachricht sind erforderlich." })
  }

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    console.error("SMTP env vars missing", { host: !!host, port: !!port, user: !!user, pass: !!pass })
    return res.status(500).json({ success: false, error: "Mail-Server ist nicht konfiguriert." })
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  const fromAddress = process.env.MAIL_FROM || user
  const toAddress = process.env.MAIL_TO || "info@sygs.de"

  const mailOptions = {
    from: `"Kontaktformular" <${fromAddress}>`,
    to: toAddress,
    replyTo: email,
    subject: subject,
    text: `Name: ${firstName || ""} ${lastName || ""}\nEmail: ${email}\n\n${message}`,
  }

  try {
    await transporter.sendMail(mailOptions)
    return res.status(200).json({ success: true })
  } catch (error: unknown) {
    let errorMsg = "Unbekannter Fehler"
    if (error instanceof Error) errorMsg = error.message
    else if (typeof error === "string") errorMsg = error
    console.error("Mail Error:", error)
    return res.status(500).json({ success: false, error: errorMsg })
  }
}
