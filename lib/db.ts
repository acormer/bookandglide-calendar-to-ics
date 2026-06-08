import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

// Tables managed by Better Auth
interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionTable {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

interface AccountTable {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// App-specific tables
export interface UserTokenTable {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
}

export interface FeedStatusTable {
  id: string;
  userId: string;
  feed: 'calendar' | 'meteo';
  lastFetchedAt: Date | null;
  lastError: string | null;
}

export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  user_tokens: UserTokenTable;
  feed_status: FeedStatusTable;
}

let _db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!_db) {
    _db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      }),
      plugins: [new CamelCasePlugin()],
    });
  }
  return _db;
}

export const db = new Proxy({} as Kysely<Database>, {
  get: (_, prop) => {
    const instance = getDb();
    const value = instance[prop as keyof Kysely<Database>];
    return typeof value === 'function' ? (value as Function).bind(instance) : value;
  },
});
