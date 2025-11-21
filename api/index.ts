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
export default async (request: VercelRequest, response: VercelResponse) => {
  try {
    // Asegurarse de que el cuerpo de la solicitud es un objeto
    if (typeof request.body !== 'object' || request.body === null) {
      console.error("Cuerpo de la solicitud inválido:", request.body);
      return response.status(400).send("Cuerpo de la solicitud inválido");
    }

    // Usar el manejador de webhook de grammY
    await webhookCallback(bot, "vercel")(request, response);
  } catch (error) {
    console.error("Error al procesar la solicitud del webhook:", error);
    // Enviar una respuesta genérica en caso de error
    return response.status(500).send("Error interno del servidor");
  }
};
