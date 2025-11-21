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
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    // Crear el manejador de grammY
    const callback = webhookCallback(bot, "vercel");

    // Asegurar que solo se procesen las solicitudes POST
    if (request.method === "POST") {
      await callback(request, response);
    } else {
      // Responder a otras solicitudes (ej. GET) con un mensaje de bienvenida
      response.status(200).send("Bot de Telegram listo y escuchando.");
    }
  } catch (error) {
    console.error("Error al procesar la solicitud del webhook:", error);
    response.status(500).send("Error interno del servidor");
  }
}
