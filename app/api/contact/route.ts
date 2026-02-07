import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, subject, message } = await request.json()

    // Transporter-Konfiguration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // E-Mail-Optionen
    const mailOptions = {
      from: email,
      to: "info@sygs.de",
      subject: subject,
      text: `Name: ${firstName} ${lastName}\nEmail: ${email}\n\n${message}`,
    }

    // E-Mail senden
    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
