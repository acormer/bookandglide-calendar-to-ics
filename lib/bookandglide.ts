import { DateTime } from 'luxon';

const BASE_URL = 'https://bookandglide.com';
const USER_AGENT =
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0';
const TZ = 'Europe/Paris';

export interface BgEvent {
  id: string | number;
  title: string;
  start: string;
  end: string;
  type: string;
}

// ---- cookie helpers --------------------------------------------------------

function parseCookies(headers: Headers): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookies = headers.getSetCookie?.() ?? [];
  for (const setCookie of setCookies) {
    const [nameValue] = setCookie.split(';');
    const eqIdx = nameValue.indexOf('=');
    if (eqIdx > 0) {
      cookies[nameValue.slice(0, eqIdx).trim()] = nameValue.slice(eqIdx + 1).trim();
    }
  }
  return cookies;
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

// ---- date helpers ----------------------------------------------------------

export function fmtParisDate(d: Date): string {
  return DateTime.fromJSDate(d).setZone(TZ).toFormat("yyyy-MM-dd'T'HH:mm:ssZZ");
}

export function weekBounds(): [Date, Date] {
  const now = DateTime.now().setZone(TZ);
  const monday = now.startOf('week'); // luxon weeks start Monday
  return [monday.toJSDate(), monday.plus({ weeks: 2 }).toJSDate()];
}

export function parseParisDT(str: string): Date {
  return DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm:ss', { zone: TZ }).toJSDate();
}

// ---- BookAndGlide login ----------------------------------------------------

async function login(): Promise<string> {
  const getResp = await fetch(`${BASE_URL}/admin/login`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  const html = await getResp.text();

  const tagMatch = html.match(/<input[^>]+name="user_login\[_token\]"[^>]*>/);
  const valueMatch = tagMatch ? tagMatch[0].match(/value="([^"]+)"/) : null;
  if (!valueMatch) throw new Error('CSRF token not found on login page');

  const cookies = parseCookies(getResp.headers);

  const body = new URLSearchParams({
    'user_login[email]': process.env.BG_EMAIL!,
    'user_login[password]': process.env.BG_PASSWORD!,
    'user_login[_token]': valueMatch[1],
  });

  // redirect: manual so we capture Set-Cookie from the 302 before it's followed
  const postResp = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: BASE_URL,
      Referer: `${BASE_URL}/admin/login`,
      Cookie: cookieHeader(cookies),
    },
    body: body.toString(),
    redirect: 'manual',
  });

  const location = postResp.headers.get('location') ?? '';
  if (postResp.status !== 302 || location.includes('/admin/login')) {
    throw new Error('Login failed — check BG_EMAIL / BG_PASSWORD');
  }

  Object.assign(cookies, parseCookies(postResp.headers));
  return cookieHeader(cookies);
}

// ---- event fetching --------------------------------------------------------

export async function fetchBGEvents(): Promise<BgEvent[]> {
  const cookie = await login();
  const [start, end] = weekBounds();

  const url = new URL(`${BASE_URL}/admin/tandems/calendar`);
  url.searchParams.set('start', fmtParisDate(start));
  url.searchParams.set('end', fmtParisDate(end));

  const resp = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookie,
    },
  });

  const data: BgEvent[] = await resp.json();
  return data.filter((e) => e.type === 'tandem');
}
