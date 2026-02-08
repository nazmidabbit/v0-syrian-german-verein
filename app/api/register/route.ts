import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '../../../lib/user';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

mongoose.connect(process.env.MONGODB_URI || '', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export async function POST(request: Request) {
  const { email, password, name } = await request.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ error: 'Benutzer existiert bereits.' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = new User({
    email,
    password: hashedPassword,
    name,
    isVerified: false,
    verificationToken,
  });
  await user.save();

  // Bestätigungs-E-Mail senden
  const { sendVerificationEmail } = await import('../../../lib/mailer');
  await sendVerificationEmail(email, verificationToken);

  return NextResponse.json({ message: 'Registrierung erfolgreich. Bitte E-Mail bestätigen.' });
}
