import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

type DbInstance = NodePgDatabase<typeof schema> & { $client: Pool };

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: DbInstance;
};

function buildPoolConfig(rawUrl: string): PoolConfig {
  const connectionString = rawUrl.trim();
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);

    let ssl: PoolConfig["ssl"];
    if (sslMode === "disable") {
      parsed.searchParams.delete("sslmode");
      ssl = false;
    } else if (sslMode === "verify-full") {
      parsed.searchParams.delete("sslmode");
      ssl = { rejectUnauthorized: true };
    } else if (!isLocal || sslMode) {
      parsed.searchParams.delete("sslmode");
      ssl = { rejectUnauthorized: false };
    }

    return {
      connectionString: parsed.toString(),
      ...(ssl !== undefined ? { ssl } : {}),
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    };
  } catch {
    return {
      connectionString,
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    };
  }
}

function getSupabasePoolerFallbacks(rawUrl: string): string[] {
  try {
    const parsed = new URL(rawUrl.trim());
    const match = parsed.hostname.match(/^aws-(\d+)-([a-z0-9-]+)\.pooler\.supabase\.com$/i);
    if (!match) return [];
    const currentShard = Number(match[1]);
    const region = match[2];
    return [0, 1, 2, 3]
      .filter((shard) => shard !== currentShard)
      .map((shard) => {
        const next = new URL(parsed.toString());
        next.hostname = `aws-${shard}-${region}.pooler.supabase.com`;
        return next.toString();
      });
  } catch {
    return [];
  }
}

function isTenantNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const message = "message" in err && typeof err.message === "string" ? err.message : "";
  return message.includes("Tenant or user not found");
}

function createPool(rawUrl: string): Pool {
  const primaryPool = new Pool(buildPoolConfig(rawUrl));
  primaryPool.on("error", () => {});

  const fallbackUrls = getSupabasePoolerFallbacks(rawUrl);
  if (fallbackUrls.length === 0) {
    return primaryPool;
  }

  let activePool: Pool = primaryPool;
  let fallbackIndex = 0;

  return new Proxy(primaryPool, {
    get(_target, prop) {
      if (prop === "query" || prop === "connect") {
        return (...args: unknown[]) => {
          const lastArg = args[args.length - 1];
          if (typeof lastArg === "function") {
            return (activePool as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...args);
          }
          return (async () => {
            while (true) {
              try {
                return await (activePool as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[prop](...args);
              } catch (err) {
                if (isTenantNotFoundError(err) && fallbackIndex < fallbackUrls.length) {
                  const nextUrl = fallbackUrls[fallbackIndex++];
                  const nextPool = new Pool(buildPoolConfig(nextUrl));
                  nextPool.on("error", () => {});
                  activePool = nextPool;
                  continue;
                }
                throw err;
              }
            }
          })();
        };
      }
      const value = Reflect.get(activePool, prop, activePool);
      return typeof value === "function" ? value.bind(activePool) : value;
    },
  });
}

function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const instance = createPool(databaseUrl);
  globalForDb.__arenaNextJsPostgresqlPool = instance;
  return instance;
}

function getDb(): DbInstance {
  if (globalForDb.__arenaNextJsPostgresqlDb) {
    return globalForDb.__arenaNextJsPostgresqlDb;
  }
  const instance = drizzle(getPool(), { schema });
  globalForDb.__arenaNextJsPostgresqlDb = instance;
  return instance;
}

export const pool: Pool = new Proxy(Object.create(Pool.prototype) as Pool, {
  get(_target, prop) {
    const instance = getPool();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
