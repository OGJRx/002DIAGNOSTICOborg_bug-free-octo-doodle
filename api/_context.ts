import { Bot } from "grammy";
import { Pool, PoolConfig } from "pg";
import { MyContext } from "./_types";
import { lookup } from "dns/promises"; // Import dns.promises for async lookup
import { URL } from "url"; // Import URL to parse connection string

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
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) && !/^\[.*\]$/.test(host)) { // Basic check for IPv4 or IPv6 literal
        try {
          const { address } = await lookup(dbUrl.hostname);
          host = address; // Use the resolved IP address
          console.log(`Resolved DB host '${dbUrl.hostname}' to IP: ${host}`);
        } catch (dnsErr) {
          console.error(`Failed to resolve DB host '${dbUrl.hostname}':`, dnsErr);
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