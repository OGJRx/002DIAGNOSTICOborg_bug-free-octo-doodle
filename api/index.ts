import type { VercelRequest, VercelResponse } from "@vercel/node";
import { webhookCallback } from "grammy";
import { App } from "./_context";
import { setupBot } from "./_bot";
import { MyContext } from "./_types";

const app = App.getInstance();
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

const handleUpdate = webhookCallback(bot, "next-js");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleUpdate(req, res);
}