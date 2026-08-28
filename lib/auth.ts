import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { getPgConfig } from './pg-ssl';

function getAuth() {
  return betterAuth({
    database: new Pool(getPgConfig(process.env.DATABASE_URL)),
    emailAndPassword: { enabled: true },
  });
}

type Auth = ReturnType<typeof getAuth>;
let _auth: Auth | null = null;

export const auth: Auth = new Proxy({} as Auth, {
  get: (_, prop) => {
    if (!_auth) _auth = getAuth();
    return _auth[prop as keyof Auth];
  },
  has: (_, prop) => {
    if (!_auth) _auth = getAuth();
    return prop in _auth;
  },
});
