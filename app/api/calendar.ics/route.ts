import { NextRequest, NextResponse } from 'next/server';
import { fetchBGEvents } from '@/lib/bookandglide';
import { buildCalendarIcs } from '@/lib/ics';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  // Support both global secret and per-user tokens
  const globalSecret = process.env.CALENDAR_SECRET;
  if (globalSecret && token === globalSecret) {
    // Global token — allow
  } else if (token) {
    const row = await db
      .selectFrom('user_tokens')
      .select('userId')
      .where('token', '=', token)
      .executeTakeFirst();
    if (!row) return new NextResponse('Forbidden', { status: 403 });
  } else if (globalSecret) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const events = await fetchBGEvents();
  const ics = buildCalendarIcs(events);

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename=bookandglide.ics',
    },
  });
}
