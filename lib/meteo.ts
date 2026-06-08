import { parse } from 'node-html-parser';
import { DateTime } from 'luxon';

const METEO_URL = 'https://www.meteoalpes.fr/bulletin/alpes-du-nord/';
const USER_AGENT =
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0';
const TZ = 'Europe/Paris';

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1, février: 2, mars: 3, avril: 4,
  mai: 5, juin: 6, juillet: 7, août: 8,
  septembre: 9, octobre: 10, novembre: 11, décembre: 12,
};

const DAY_HEADER = /(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s+(\d+)\s+(\w+)\s+(\d{4})/gi;

export interface ForecastDay {
  date: Date;
  text: string;
}

export async function fetchWeatherForecast(): Promise<ForecastDay[]> {
  const resp = await fetch(METEO_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });
  const html = await resp.text();
  const root = parse(html);

  const blocks = root.querySelectorAll('div.j-module.j-text');
  const fullText = blocks.map((b) => b.text).join('\n');

  const parts = fullText.split(DAY_HEADER);
  const results: ForecastDay[] = [];

  let i = 1;
  while (i + 4 <= parts.length) {
    const dd = parts[i + 1];
    const monthFr = parts[i + 2];
    const yyyy = parts[i + 3];
    const body = parts[i + 4]
      .replace(/^\s*:?\s*/, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const monthNum = FRENCH_MONTHS[monthFr.toLowerCase()];
    if (monthNum) {
      const dt = DateTime.fromObject(
        { year: parseInt(yyyy), month: monthNum, day: parseInt(dd) },
        { zone: TZ }
      );
      results.push({ date: dt.toJSDate(), text: body });
    }

    i += 5;
  }

  return results;
}
