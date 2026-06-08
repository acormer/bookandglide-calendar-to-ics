import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherForecast } from '@/lib/meteo';
import { buildMeteoIcs } from '@/lib/ics';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

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

  const forecast = await fetchWeatherForecast();
  const ics = buildMeteoIcs(forecast);

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename=meteo.ics',
    },
  });
}
