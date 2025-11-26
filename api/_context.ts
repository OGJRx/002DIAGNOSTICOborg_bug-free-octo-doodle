import { Bot } from "grammy";
import { Pool } from "pg";
import { MyContext } from "./_types";
import { logger } from "./_logger"; // Mantener el logger

export class App {
  private static instance: App;
  public readonly dbPool: Pool;
  public readonly bot: Bot<MyContext>;

  private constructor() {
    if (!process.env.POSTGRES_URL || !process.env.TELEGRAM_BOT_TOKEN) {
      logger.error("Missing required environment variables");
      throw new Error("Missing required environment variables");
    }
    logger.info("Initializing new Pool with Supabase Pooler URL");
    this.dbPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      // SSL es manejado por la URL del pooler, pero es bueno mantenerlo explícito si es necesario
      ssl: {
        rejectUnauthorized: false,
      },
    });
    this.bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN);
  }

  public static getInstance(): App {
    if (!App.instance) {
      App.instance = new App();
    }
    return App.instance;
  }
}
