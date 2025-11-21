import { Bot } from "grammy";
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
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    // Asegurarse de que el método sea POST y que el cuerpo exista
    if (request.method === "POST" && request.body) {
      // Pasar el update directamente al bot
      await bot.handleUpdate(request.body);
    }
  } catch (error) {
    console.error("Error al procesar el update manual:", error);
  }

  // Responder siempre 200 OK a Telegram para evitar reintentos.
  // El procesamiento real ocurre en segundo plano.
  response.status(200).end();
}
