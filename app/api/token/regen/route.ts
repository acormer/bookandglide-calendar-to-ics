import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const userId = session.user.id;
  const token = randomBytes(32).toString('hex');
  const id = randomBytes(16).toString('hex');

  // Upsert: delete old token then insert new one
  await db.deleteFrom('user_tokens').where('userId', '=', userId).execute();
  await db
    .insertInto('user_tokens')
    .values({ id, userId, token, createdAt: new Date() })
    .execute();

  return NextResponse.json({ token });
}
