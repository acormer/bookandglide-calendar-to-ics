import ical from 'ical-generator';
import { getVtimezoneComponent } from '@touch4it/ical-timezones';
import { DateTime } from 'luxon';
import type { BgEvent } from './bookandglide';
import type { ForecastDay } from './meteo';

const TZ = 'Europe/Paris';

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function buildCalendarIcs(events: BgEvent[]): string {
  const cal = ical({
    prodId: '-//BookAndGlide ICS//EN',
    name: 'BookAndGlide Tandems',
    timezone: { name: TZ, generator: getVtimezoneComponent },
  });

  // Hint to calendar clients: refresh every hour
  cal.x([{ key: 'X-WR-TIMEZONE', value: TZ }]);
  cal.x([{ key: 'X-PUBLISHED-TTL', value: 'PT1H' }]);

  const now = DateTime.now().setZone(TZ).toJSDate();

  for (const e of events) {
    const start = DateTime.fromFormat(e.start, 'yyyy-MM-dd HH:mm:ss', { zone: TZ }).toJSDate();
    const end = DateTime.fromFormat(e.end, 'yyyy-MM-dd HH:mm:ss', { zone: TZ }).toJSDate();

    cal.createEvent({
      id: `${e.id}@bookandglide.com`,
      summary: stripHtml(e.title),
      start,
      end,
      stamp: now,
      timezone: TZ,
    });
  }

  return cal.toString();
}

export function buildMeteoIcs(forecast: ForecastDay[]): string {
  const cal = ical({
    prodId: '-//Météo Alpes du Nord ICS//EN',
    name: 'Météo Alpes du Nord',
    timezone: { name: TZ, generator: getVtimezoneComponent },
  });

  cal.x([{ key: 'X-WR-TIMEZONE', value: TZ }]);
  cal.x([{ key: 'REFRESH-INTERVAL;VALUE=DURATION', value: 'PT6H' }]);

  const now = DateTime.now().setZone(TZ).toJSDate();

  for (const { date, text } of forecast) {
    const dt = DateTime.fromJSDate(date).setZone(TZ);
    const start = dt.set({ hour: 6, minute: 0, second: 0, millisecond: 0 }).toJSDate();
    const end = dt.set({ hour: 7, minute: 0, second: 0, millisecond: 0 }).toJSDate();
    const isoDate = dt.toISODate()!;

    cal.createEvent({
      id: `meteo-${isoDate}@meteoalpes.fr`,
      summary: 'Météo Alpes du Nord',
      start,
      end,
      description: text,
      stamp: now,
      timezone: TZ,
    });
  }

  return cal.toString();
}
