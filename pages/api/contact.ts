import nodemailer from "nodemailer"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { firstName, lastName, email, subject, message } = req.body

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const mailOptions = {
    from: email,
    to: "info@sygs.de",
    subject: subject,
    text: `Name: ${firstName} ${lastName}\nEmail: ${email}\n\n${message}`,
  }

  try {
    await transporter.sendMail(mailOptions)
    return res.status(200).json({ success: true })
  } catch (error: unknown) {
    let errorMsg = "Unbekannter Fehler"
    if (error instanceof Error) {
      errorMsg = error.message
    } else if (typeof error === "string") {
      errorMsg = error
    }
    // Logge den Fehler für Debugging
    // eslint-disable-next-line no-console
    console.error("Mail Error:", error)
    return res.status(500).json({ success: false, error: errorMsg })
  }
}
