import 'dotenv/config'; // Load environment variables from .env file
import { Bot } from 'grammy';

async function setWebhook() {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const vercelUrl = process.env.VERCEL_URL;

  if (!telegramBotToken) {
    console.error('Error: TELEGRAM_BOT_TOKEN environment variable is not set.');
    process.exit(1);
  }

if (!vercelUrl) {
    console.error('Error: VERCEL_URL environment variable is not set.');
    process.exit(1);
  }

  const bot = new Bot(telegramBotToken);
  const webhookUrl = `${vercelUrl}/api`; // Assuming the Vercel API route is '/api' for the bot

  try {
    // Attempt to delete any existing webhook first to ensure a clean slate
    await bot.api.deleteWebhook();
    console.log('Successfully deleted existing webhook (if any).');

    await bot.api.setWebhook(webhookUrl);
    console.log(`Webhook successfully set to: ${webhookUrl}`);
  } catch (error) {
    console.error('Error setting webhook:', error);
    process.exit(1);
  }
}

setWebhook();
