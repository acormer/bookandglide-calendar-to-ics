// Neon's TLS chain isn't trusted by Node's default CA store in some serverless
// runtimes (e.g. Vercel), which raises SELF_SIGNED_CERT_IN_CHAIN over a raw `pg`
// connection. Local Docker Postgres has no TLS at all, so only enable (relaxed)
// SSL when we're not talking to localhost.
export function getPgSsl(connectionString: string | undefined) {
  if (!connectionString || /(^|@)(localhost|127\.0\.0\.1)/.test(connectionString)) {
    return undefined;
  }
  return { rejectUnauthorized: false };
}
