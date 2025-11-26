import { Bot } from "grammy";
import { Pool } from "pg";
import { MyContext } from "./_types";

export class App {
  private static instance: App;
  public readonly dbPool: Pool;
  public readonly bot: Bot<MyContext>;

  private constructor() {
    if (!process.env.POSTGRES_URL || !process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("Missing required environment variables");
    }
    this.dbPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      // Required for Vercel to connect to Supabase DB
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