import { Bot } from "grammy";

// Cargar la variable de entorno de forma segura.
// Si no existe, el proceso fallará al arrancar, lo cual es deseable
// para detectar errores de configuración inmediatamente.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("FATAL: TELEGRAM_BOT_TOKEN no está configurado en las variables de entorno.");
}

// Crear la instancia del bot.
const bot = new Bot(BOT_TOKEN);

// Aquí es donde registraremos toda la lógica del bot (comandos, middleware, etc.)
// Por ahora, solo tenemos el comando /start.
bot.command("start", (ctx) => {
  ctx.reply("¡Hola! Soy un bot de Telegram desplegado en Vercel. ¡Listo para automatizar!");
});

// Exportamos la instancia para que pueda ser utilizada en otros archivos.
export { bot };
