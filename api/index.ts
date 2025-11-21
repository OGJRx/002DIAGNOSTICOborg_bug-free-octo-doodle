import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bot } from "./_bot";

// --- INICIALIZACIÓN EFICIENTE ---
// Creamos una promesa que se resuelve cuando bot.init() termina.
// Esto se ejecuta UNA SOLA VEZ cuando la instancia de Vercel arranca ("cold start").
const initializePromise = bot.init();

/**
 * El handler principal de la Vercel Function.
 * Es el único punto de entrada para todas las solicitudes al webhook.
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    // 1. Esperamos a que la inicialización se complete.
    // En invocaciones "warm", esta promesa ya estará resuelta y continuará inmediatamente.
    await initializePromise;

    // 2. Pasamos el update al bot si la solicitud es válida.
    if (request.method === "POST" && request.body) {
      await bot.handleUpdate(request.body);
    }
  } catch (error) {
    // Es crucial loguear el error para la depuración en Vercel.
    console.error("Error en el handler principal:", error);
  }

  // 3. Respondemos 200 OK a Telegram inmediatamente.
  // Esto evita reintentos de webhook, incluso si el procesamiento del bot falla.
  response.status(200).end();
}