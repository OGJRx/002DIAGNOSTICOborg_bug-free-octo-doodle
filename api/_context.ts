import { Bot } from "grammy";
import { Pool, PoolConfig } from "pg";
import { MyContext } from "./_types";
import { lookup } from "dns/promises";
import { URL } from "url";
import { logger } from "./_logger";
import { fetch } from "undici";

async function resolveHostnameWithDoH(hostname: string): Promise<string> {
  const url = `https://dns.google/resolve?name=${hostname}&type=A`;
  logger.info(`Performing DoH lookup for ${hostname}`, { url });
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DoH request failed with status: ${response.status}`);
    }
    const data: any = await response.json();
    if (data.Answer && data.Answer.length > 0) {
      const ipAddress = data.Answer[0].data;
      logger.info(`DoH lookup successful for ${hostname}`, { ipAddress });
      return ipAddress;
    }
    throw new Error(`No A records found for ${hostname} using DoH`);
  } catch (error: any) {
    logger.error(`DoH lookup failed for ${hostname}`, {
      error: error.message || error.toString(),
    });
    throw new Error(`Could not resolve host ${hostname} using DoH`);
  }
}

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
          const address = await resolveHostnameWithDoH(dbUrl.hostname);
          host = address;
        } catch (dnsErr) {
          logger.error("DNS lookup via DoH failed, falling back to native lookup.", {
            originalHost: dbUrl.hostname,
            error: dnsErr,
          });
          // Fallback to native DNS lookup as a last resort
          try {
            const { address } = await lookup(dbUrl.hostname, { family: 4 });
            host = address;
            logger.info("Fallback DNS lookup successful", {
              originalHost: dbUrl.hostname,
              resolvedHost: host,
            });
          } catch (nativeDnsErr) {
            logger.error("Fallback native DNS lookup also failed.", {
              originalHost: dbUrl.hostname,
              error: nativeDnsErr,
            });
            throw new Error(`Failed to resolve database host: ${dbUrl.hostname}`);
          }
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