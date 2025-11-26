import { MyContext } from "./_types";
import { NextFunction } from "grammy";
import { logger } from "./_logger";

/**
 * Middleware to check if the user is a staff member.
 * It checks if the user's ID is in the `STAFF_IDS` environment variable.
 *
 * @param ctx The context object.
 * @param next The next middleware function.
 */
export const isStaff = (ctx: MyContext, next: NextFunction) => {
    const staffIds = process.env.STAFF_IDS?.split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id)) || [];
    const userId = ctx.from?.id;

    if (userId && staffIds.includes(userId)) {
        logger.info(`User ${userId} is authorized as staff.`);
        return next();
    } else {
        logger.warn(`Unauthorized access attempt by user ${userId}.`);
        return ctx.reply("You are not authorized to use this command.");
    }
};
