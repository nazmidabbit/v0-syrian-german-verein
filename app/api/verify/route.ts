import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '../../../lib/user';

mongoose.connect(process.env.MONGODB_URI || '', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token fehlt.' }, { status: 400 });
  }

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return NextResponse.json({ error: 'Ungültiger Token.' }, { status: 400 });
  }

  user.isVerified = true;
  user.verificationToken = '';
  await user.save();

  return NextResponse.json({ message: 'E-Mail erfolgreich bestätigt.' });
}
