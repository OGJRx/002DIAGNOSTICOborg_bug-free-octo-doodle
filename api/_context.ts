import { Bot } from "grammy";
import { Pool, PoolConfig } from "pg";
import { MyContext } from "./_types";
import { lookup } from "dns/promises";
import { URL } from "url";
import { logger } from "./_logger";

export class App {
  private static instance: App;
  public readonly dbPool: Pool;
  public readonly bot: Bot<MyContext>;

  private constructor(dbConfig: PoolConfig) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("Missing required environment variable: TELEGRAM_BOT_TOKEN");
    }
    this.dbPool = new Pool(dbConfig);
    this.bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN);
  }

  public static async getInstance(): Promise<App> {
    if (!App.instance) {
      if (!process.env.POSTGRES_URL) {
        throw new Error("Missing required environment variable: POSTGRES_URL");
      }
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        throw new Error("Missing required environment variable: TELEGRAM_BOT_TOKEN");
      }

      const dbUrl = new URL(process.env.POSTGRES_URL);
      let host = dbUrl.hostname;

      // Perform DNS lookup if hostname is not an IP address
      // (This prevents trying to lookup an already resolved IP, which dns.lookup would fail)
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) && !/^\[.*\]$/.test(host)) {
        try {
          const { address } = await lookup(dbUrl.hostname, { family: 4 });
          host = address;
          logger.info("DNS lookup successful", {
            originalHost: dbUrl.hostname,
            resolvedHost: host,
          });
        } catch (dnsErr) {
          logger.error("DNS lookup failed", {
            originalHost: dbUrl.hostname,
            error: dnsErr,
          });
          throw new Error(`Failed to resolve database host: ${dbUrl.hostname}`);
        }
      }

      const dbConfig: PoolConfig = {
        host: host,
        port: dbUrl.port ? parseInt(dbUrl.port, 10) : 5432, // Default PostgreSQL port
        user: dbUrl.username,
        password: dbUrl.password,
        database: dbUrl.pathname.slice(1),
        ssl: {
          rejectUnauthorized: false,
        },
      };

      App.instance = new App(dbConfig);
    }
    return App.instance;
  }

}