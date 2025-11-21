import { Bot, Context, session, SessionFlavor } from "grammy";
import {
  conversations,
  createConversation,
  type Conversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import { query } from "./_db";

// 1. Define the type for the session data.
interface SessionData {
  customerName?: string;
  customerPhone?: string;
  vehicleMakeModel?: string;
  problemDescription?: string;
}

// 2. Define a BASE context that includes the session. This is for the conversation logic.
type BaseContext = Context & SessionFlavor<SessionData>;

// 3. Define the FINAL context for the bot and middleware, wrapping the base context.
type MyContext = BaseContext & ConversationFlavor<BaseContext>;

// 4. Define the conversation type based on the BASE context.
type MyConversation = Conversation<BaseContext>;


const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("FATAL: TELEGRAM_BOT_TOKEN no está configurado en las variables de entorno.");
}

// The bot instance is typed with our final, composed `MyContext`.
const bot = new Bot<MyContext>(BOT_TOKEN);

// Install session middleware with in-memory storage (placeholder).
bot.use(session({ initial: () => ({}) }));

// Install conversations middleware.
bot.use(conversations());

// --- Conversation logic for the /agendar command ---
// Note: This function now operates on the simpler `BaseContext`.
async function agendarConversation(conversation: MyConversation, ctx: BaseContext) {
  try {
    await ctx.reply("¡Claro! Empecemos con tu cita. ¿Cuál es tu nombre completo? (o usa /cancel para salir)");
    let name = (await conversation.form.text()).trim();
    while (!name || name.length > 100) {
      await ctx.reply("El nombre es inválido. Debe tener entre 1 y 100 caracteres. Inténtalo de nuevo.");
      name = (await conversation.form.text()).trim();
    }
    ctx.session.customerName = name;

    await ctx.reply("¿Cuál es tu número de teléfono (con código de área)?");
    let phone = (await conversation.form.text()).trim();
    while (!/^[0-9+\s-]{7,20}$/.test(phone)) {
      await ctx.reply("El teléfono es inválido. Ingresa un número de entre 7 y 20 dígitos. Inténtalo de nuevo.");
      phone = (await conversation.form.text()).trim();
    }
    ctx.session.customerPhone = phone;

    await ctx.reply("¿Cuál es la marca y modelo de tu vehículo (ej: Toyota Corolla)?");
    let vehicle = (await conversation.form.text()).trim();
    while (!vehicle || vehicle.length > 100) {
      await ctx.reply("La marca y modelo son inválidos. Deben tener entre 1 y 100 caracteres. Inténtalo de nuevo.");
      vehicle = (await conversation.form.text()).trim();
    }
    ctx.session.vehicleMakeModel = vehicle;

    await ctx.reply("Por favor, describe brevemente el problema o servicio que necesitas:");
    let problem = (await conversation.form.text()).trim();
    while (!problem || problem.length > 500) {
      await ctx.reply("La descripción es inválida. Debe tener entre 1 y 500 caracteres. Inténtalo de nuevo.");
      problem = (await conversation.form.text()).trim();
    }
    ctx.session.problemDescription = problem;

    // Final confirmation before saving
    await ctx.reply(
      `Confirmación de tu cita:\n` +
      `Nombre: ${ctx.session.customerName}\n` +
      `Teléfono: ${ctx.session.customerPhone}\n` +
      `Vehículo: ${ctx.session.vehicleMakeModel}\n` +
      `Problema: ${ctx.session.problemDescription}\n\n` +
      `¿Es correcto? (Sí/No)`
    );

    const confirmation = (await conversation.form.text()).trim().toLowerCase();
    if (confirmation !== 'sí' && confirmation !== 'si') {
      await ctx.reply("Cita cancelada. Puedes volver a intentarlo cuando quieras.");
      return;
    }

    // Insert into the database
    const insertQuery = `
      INSERT INTO jobs (
        telegram_user_id,
        telegram_chat_id,
        customer_name,
        customer_phone,
        vehicle_make_model,
        problem_description,
        current_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'AGENDADO') RETURNING job_id;
    `;
    const result = await query(insertQuery, [
      ctx.from?.id,
      ctx.chat?.id,
      ctx.session.customerName,
      ctx.session.customerPhone,
      ctx.session.vehicleMakeModel,
      ctx.session.problemDescription,
    ]);

    const jobId = result.rows[0].job_id;
    await ctx.reply(
      `¡Gracias! Tu cita ha sido agendada con éxito. ` +
      `Tu número de referencia es: #${jobId}.\n` +
      `Pronto nos pondremos en contacto contigo.`
    );

  } catch (error) {
    console.error("Error in agendamiento conversation:", error);
    await ctx.reply("Lo siento, hubo un error al agendar tu cita. Por favor, intenta de nuevo más tarde.");
    // It's a good practice to log the session data for debugging
    conversation.log("Error occurred. Session data:", ctx.session);
  } finally {
    // Clean up the session after the conversation is over.
    ctx.session = {}; 
  }
}

// Register the conversation.
// The `as any` is a deliberate workaround for a persistent and unresolvable
// type conflict between the grammy and @grammyjs/conversations libraries.
// The function `agendarConversation` itself remains fully type-safe. This
// assertion simply bypasses the faulty check at the point of registration.
bot.use(createConversation(agendarConversation as any));

// Command to cancel any ongoing conversation
bot.command("cancel", async (ctx: MyContext) => {
  await ctx.conversation.exit();
  ctx.session = {}; // Clear session data
  await ctx.reply("Acción cancelada. No se ha guardado ninguna información. Puedes empezar de nuevo cuando quieras.");
});

// /start command - receives the full `MyContext`
bot.command("start", (ctx: MyContext) => {
  const welcomeMessage = `
**¡Bienvenido a Diagnóstico BORG!** 🚗💨

Tu asistente de confianza para el cuidado de tu vehículo. Estoy aquí para ayudarte a agendar citas, consultar el estado de tu servicio y obtener cotizaciones, todo de forma rápida y sencilla.

**¿Qué necesitas hacer hoy?**

- Para agendar una nueva cita, usa el comando /agendar.
- Para consultar el estado de un servicio, usa /estado.

¡Estamos para servirte!
  `;
  ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
});

// /agendar command - receives the full `MyContext` to access `.conversation`
bot.command("agendar", async (ctx: MyContext) => {
  await ctx.conversation.enter("agendarConversation");
});

// Export the bot instance so it can be used by the Vercel serverless function.
export { bot };
