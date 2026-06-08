import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchBGEvents, parseParisDT } from '@/lib/bookandglide';
import { fetchWeatherForecast } from '@/lib/meteo';
import { FeedCard } from './components/FeedCard';
import { randomBytes } from 'crypto';
import { DateTime } from 'luxon';

const TZ = 'Europe/Paris';
const BASE_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

async function getOrCreateToken(userId: string): Promise<string> {
  const existing = await db
    .selectFrom('user_tokens')
    .select('token')
    .where('userId', '=', userId)
    .executeTakeFirst();

  if (existing) return existing.token;

  const token = randomBytes(32).toString('hex');
  await db
    .insertInto('user_tokens')
    .values({ id: randomBytes(16).toString('hex'), userId, token, createdAt: new Date() })
    .execute();

  return token;
}

async function updateFeedStatus(
  userId: string,
  feed: 'calendar' | 'meteo',
  error: string | null
) {
  await db
    .insertInto('feed_status')
    .values({
      id: randomBytes(16).toString('hex'),
      userId,
      feed,
      lastFetchedAt: error ? null : new Date(),
      lastError: error,
    })
    .onConflict((oc) =>
      oc.columns(['userId', 'feed']).doUpdateSet({
        lastFetchedAt: error ? undefined : new Date(),
        lastError: error,
      })
    )
    .execute();
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const userId = session.user.id;
  const token = await getOrCreateToken(userId);
  const subscriptionBase = `${BASE_URL}/api`;

  // Fetch feed statuses from DB
  const [calStatus, meteoStatus] = await Promise.all([
    db.selectFrom('feed_status').selectAll().where('userId', '=', userId).where('feed', '=', 'calendar').executeTakeFirst(),
    db.selectFrom('feed_status').selectAll().where('userId', '=', userId).where('feed', '=', 'meteo').executeTakeFirst(),
  ]);

  // Fetch live events for preview (parallel, best-effort)
  const [calResult, meteoResult] = await Promise.allSettled([
    fetchBGEvents(),
    fetchWeatherForecast(),
  ]);

  // Update feed status
  await Promise.all([
    updateFeedStatus(userId, 'calendar', calResult.status === 'rejected' ? String(calResult.reason) : null),
    updateFeedStatus(userId, 'meteo', meteoResult.status === 'rejected' ? String(meteoResult.reason) : null),
  ]);

  const calEvents =
    calResult.status === 'fulfilled'
      ? calResult.value.slice(0, 5).map((e) => ({
          summary: e.title.replace(/<[^>]+>/g, '').trim(),
          start: DateTime.fromJSDate(parseParisDT(e.start)).setZone(TZ).toFormat('dd/MM HH:mm'),
        }))
      : [];

  const meteoEvents =
    meteoResult.status === 'fulfilled'
      ? meteoResult.value.slice(0, 5).map((f) => ({
          summary: DateTime.fromJSDate(f.date).setZone(TZ).toFormat('EEEE dd MMMM', { locale: 'fr' }),
          start: f.text.slice(0, 60) + (f.text.length > 60 ? '…' : ''),
        }))
      : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Your calendars</h1>
          <span className="text-sm text-gray-500">{session.user.email}</span>
        </div>

        <FeedCard
          title="BookAndGlide Tandems"
          subscriptionUrl={`${subscriptionBase}/calendar.ics?token=${token}`}
          events={calEvents}
          lastFetchedAt={calStatus?.lastFetchedAt ?? null}
          lastError={calStatus?.lastError ?? null}
          showTokenRegen
        />

        <FeedCard
          title="Météo Alpes du Nord"
          subscriptionUrl={`${subscriptionBase}/meteo.ics?token=${token}`}
          events={meteoEvents}
          lastFetchedAt={meteoStatus?.lastFetchedAt ?? null}
          lastError={meteoStatus?.lastError ?? null}
        />
      </div>
    </main>
  );
}
