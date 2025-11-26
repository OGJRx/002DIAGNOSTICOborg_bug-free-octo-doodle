import { MyContext } from "./_types";
import { Middleware } from "grammy";

export const isAdmin: Middleware<MyContext> = async (ctx, next) => {
  const staffIds = (process.env.STAFF_IDS || "")
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  if (ctx.from && staffIds.includes(ctx.from.id)) {
    await next();
  } else {
    await ctx.reply("⛔️ Access denied. This command is for authorized staff only.");
  }
};
