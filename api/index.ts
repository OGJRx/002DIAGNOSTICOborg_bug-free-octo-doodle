import type { VercelRequest, VercelResponse } from "@vercel/node";
import { webhookCallback, Bot } from "grammy";
import { App } from "./_context";
import { setupBot } from "./_bot";
import { MyContext } from "./_types";

let initializedBot: Bot<MyContext>;
let handleUpdateFn: (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

// Async IIFE to initialize the bot once globally
const initializeBotPromise = (async () => {
  const app = await App.getInstance(); // Await the async getInstance
  const bot = app.bot;

  bot.use(async (ctx: MyContext, next) => {
    const client = await app.dbPool.connect();
    ctx.db = client;
    try {
      await next();
    } finally {
      client.release();
    }
  });

  setupBot(bot);
  return bot;
})();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initializedBot) {
    initializedBot = await initializeBotPromise;
    handleUpdateFn = webhookCallback(initializedBot, "next-js");
  }

  await handleUpdateFn(req, res);
}