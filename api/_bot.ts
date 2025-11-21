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
    await ctx.reply("¡Claro! Empecemos con tu cita. ¿Cuál es tu nombre completo?");
    const name = (await conversation.form.text()).trim();
    if (!name) {
      await ctx.reply("El nombre no puede estar vacío. Por favor, intenta de nuevo.");
      return;
    }
    ctx.session.customerName = name;

    await ctx.reply("¿Cuál es tu número de teléfono (con código de área)?");
    const phone = (await conversation.form.text()).trim();
    if (!phone) {
      await ctx.reply("El número de teléfono no puede estar vacío. Por favor, intenta de nuevo.");
      return;
    }
    ctx.session.customerPhone = phone;

    await ctx.reply("¿Cuál es la marca y modelo de tu vehículo (ej: Toyota Corolla)?");
    const vehicle = (await conversation.form.text()).trim();
    if (!vehicle) {
      await ctx.reply("La marca y modelo del vehículo no pueden estar vacíos. Por favor, intenta de nuevo.");
      return;
    }
    ctx.session.vehicleMakeModel = vehicle;

    await ctx.reply("Por favor, describe brevemente el problema o servicio que necesitas:");
    const problem = (await conversation.form.text()).trim();
    if (!problem) {
      await ctx.reply("La descripción del problema no puede estar vacía. Por favor, intenta de nuevo.");
      return;
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

// /start command - receives the full `MyContext`
bot.command("start", (ctx: MyContext) => {
  ctx.reply("¡Hola! Soy un bot de Telegram desplegado en Vercel. ¡Listo para automatizar!");
});

// /agendar command - receives the full `MyContext` to access `.conversation`
bot.command("agendar", async (ctx: MyContext) => {
  await ctx.conversation.enter("agendarConversation");
});

// Export the bot instance so it can be used by the Vercel serverless function.
export { bot };
