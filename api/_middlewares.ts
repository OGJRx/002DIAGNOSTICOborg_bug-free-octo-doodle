import { NextFunction } from "grammy";
import { MyContext } from "./_types";
import { logger } from "./_logger";

const staffIds = (process.env.STAFF_IDS || "")
  .split(",")
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id));

if (staffIds.length === 0) {
  logger.warn("No staff IDs found in STAFF_IDS environment variable. All users will be treated as non-staff.");
} else {
  logger.info(`Found ${staffIds.length} staff IDs`, { staffIds });
}

export const isStaff = (ctx: MyContext, next: NextFunction) => {
  const fromId = ctx.from?.id;
  if (fromId && staffIds.includes(fromId)) {
    ctx.isStaff = true;
    return next();
  }
  ctx.isStaff = false;
  return next();
};

export const requiresStaff = async (ctx: MyContext, next: NextFunction) => {
  const fromId = ctx.from?.id;
  if (!fromId || !staffIds.includes(fromId)) {
    await ctx.reply("Sorry, this command is only available to staff members.");
    return;
  }
  return next();
};
