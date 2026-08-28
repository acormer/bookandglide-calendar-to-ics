import type { PoolConfig } from 'pg';

// `pg` merges its own pg-connection-string parse of `connectionString` on top of
// whatever config object we pass (see node_modules/pg/lib/connection-parameters.js,
// `Object.assign({}, config, parse(connectionString))`). A `sslmode=require` query
// param — present on Supabase/Neon-style connection strings — makes that parse
// produce an empty `ssl: {}`, which silently overwrites any explicit `ssl` option
// we set. We strip `sslmode` so our explicit `ssl` option is the only one `pg` sees.
//
// Local Docker Postgres has no TLS at all, so we skip all of this for localhost.
// Everywhere else, pin Supabase's CA (SUPABASE_CA_CERT) for real chain
// verification; if that env var isn't set (e.g. a fresh local checkout without
// it), fall back to encrypted-but-unverified so the app still connects.
export function getPgConfig(connectionString: string | undefined): PoolConfig {
  if (!connectionString || /(^|@)(localhost|127\.0\.0\.1)/.test(connectionString)) {
    return { connectionString };
  }

  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');

  const ca = process.env.SUPABASE_CA_CERT;
  return {
    connectionString: url.toString(),
    ssl: ca ? { ca } : { rejectUnauthorized: false },
  };
}
