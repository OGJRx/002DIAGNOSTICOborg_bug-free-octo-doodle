import { Bot, webhookCallback } from "grammy";
import { VercelRequest, VercelResponse } from "@vercel/node";

// Cargar variables de entorno
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN no está configurado en las variables de entorno.");
}

// Inicializar el bot
const bot = new Bot(BOT_TOKEN);

// Comando de bienvenida
bot.command("start", (ctx) => {
  ctx.reply("¡Hola! Soy un bot de Telegram desplegado en Vercel. ¡Listo para automatizar!");
});

// Exportar el manejador de webhook para Vercel
export default webhookCallback(bot, "vercel");
