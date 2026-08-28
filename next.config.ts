import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-auth', 'kysely', 'pg'],
  // @touch4it/ical-timezones reads VTIMEZONE data from static .ics files via
  // fs.readFileSync(path.join(__dirname, ...)) — Next's output file tracing
  // doesn't detect that dynamic path and drops the files from the deployed
  // function, so getVtimezoneComponent() silently returns null in production.
  outputFileTracingIncludes: {
    '/api/calendar.ics': ['./node_modules/@touch4it/ical-timezones/zones/**'],
    '/api/meteo.ics': ['./node_modules/@touch4it/ical-timezones/zones/**'],
  },
};

export default nextConfig;
