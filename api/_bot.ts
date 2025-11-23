import { Bot, Context, session, SessionFlavor } from "grammy";
import {
  conversations,
  createConversation,
  type Conversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import { fmt } from "@grammyjs/parse-mode"; // New import
import { query, createJob, getJobById, listJobs } from "./_db";

// 1. Define the type for the session data.
interface SessionData {
  customerName?: string;
  customerPhone?: string;
  vehicleMakeModel?: string;
  problemDescription?: string;
  scheduled_date?: string; // Add scheduled_date to session
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

const STAFF_IDS_ENV = process.env.STAFF_IDS;
const STAFF_IDS = STAFF_IDS_ENV ? STAFF_IDS_ENV.split(',').map(id => parseInt(id.trim(), 10)) : [];
if (STAFF_IDS.length === 0) {
    console.warn("WARNING: STAFF_IDS no está configurado o está vacío. La funcionalidad de la Mini App para el personal podría no funcionar.");
}

// Helper function to check if a user is staff
function isStaff(userId: number): boolean {
    return STAFF_IDS.includes(userId);
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

    await ctx.reply("¿Para qué fecha te gustaría agendar la cita? (Formato: AAAA-MM-DD)");
    const dateInput = (await conversation.form.text()).trim();
    const scheduled_date_obj = new Date(dateInput);
    if (isNaN(scheduled_date_obj.getTime())) {
        await ctx.reply("Formato de fecha inválido. Por favor, usa AAAA-MM-DD. Intenta de nuevo.");
        return;
    }
    // Store in session for confirmation
    ctx.session.scheduled_date = dateInput; // Store as YYYY-MM-DD string

    // Final confirmation before saving
    await ctx.reply(
      fmt`Confirmación de tu cita:\n` +
      fmt`Nombre: ${fmt.escape(ctx.session.customerName || 'N/A')}\n` +
      fmt`Teléfono: ${fmt.escape(ctx.session.customerPhone || 'N/A')}\n` +
      fmt`Vehículo: ${fmt.escape(ctx.session.vehicleMakeModel || 'N/A')}\n` +
      fmt`Problema: ${fmt.escape(ctx.session.problemDescription || 'N/A')}\n` +
      fmt`Fecha Agendada: ${fmt.escape(ctx.session.scheduled_date || 'N/A')}\n\n` +
      fmt`¿Es correcto? (Sí/No)`
    );

    const confirmation = (await conversation.form.text()).trim().toLowerCase();
    if (confirmation !== 'sí' && confirmation !== 'si') {
      await ctx.reply("Cita cancelada. Puedes volver a intentarlo cuando quieras.");
      return;
    }

    // Use the createJob function to insert into the database
    const newJob = await createJob(
      ctx.from?.id as number, // telegram_user_id
      ctx.chat?.id as number, // telegram_chat_id
      ctx.session.customerName as string,
      ctx.session.customerPhone as string,
      ctx.session.vehicleMakeModel as string,
      ctx.session.problemDescription as string,
      'AGENDADO', // current_status, using the literal type from Job interface
      ctx.session.scheduled_date ? new Date(ctx.session.scheduled_date) : null // scheduled_date
    );

    const jobId = newJob.id;
    await ctx.reply(
      fmt`¡Gracias! Tu cita ha sido agendada con éxito. ` +
      fmt`Tu número de referencia es: \#${jobId}.\n` + // Escaping '#' to avoid it being interpreted as Markdown
      fmt`Pronto nos pondremos en contacto contigo.`
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

// /estado command - allows users to check job status
bot.command("estado", async (ctx: MyContext) => {
  if (!ctx.from?.id || !ctx.chat?.id) {
    await ctx.reply("No pude identificar tu usuario o chat. Por favor, intenta de nuevo más tarde.");
    return;
  }

  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const jobIdArg = ctx.match; // Argument provided after /estado (e.g., "/estado 123")

  try {
    let message = "";
    if (jobIdArg) {
      // User provided a job ID
      const jobId = parseInt(jobIdArg, 10);
      if (isNaN(jobId)) {
        await ctx.reply("Formato de ID de trabajo inválido. Por favor, envía /estado o /estado [ID_DE_TRABAJO].");
        return;
      }
      const job = await getJobById(jobId);
      if (job && (job.telegram_user_id === userId || job.telegram_chat_id === chatId)) {
        // Ensure the job belongs to the user or chat requesting it
        message = fmt`Estado de trabajo \#${job.id}:\n` +
                  fmt`Cliente: ${fmt.escape(job.customer_name)}\n` +
                  fmt`Vehículo: ${fmt.escape(job.vehicle_make_model)}\n` +
                  fmt`Problema: ${fmt.escape(job.problem_description)}\n` +
                  fmt`Estado actual: ${fmt.escape(job.current_status)}\n` +
                  fmt`Agendado el: ${job.created_at.toLocaleString()}`; // Date is safe
      } else {
        message = `No se encontró un trabajo con ID #${jobId} asociado a tu cuenta.`;
      }
    } else {
      // User wants to see all their jobs
      const userJobs = await listJobs({ telegram_user_id: userId });
      if (userJobs.length > 0) {
        message = "Tus trabajos agendados:\n\n";
        userJobs.forEach(job => {
          message += fmt`ID: \#${job.id}\n` +
                     fmt`Vehículo: ${fmt.escape(job.vehicle_make_model)}\n` +
                     fmt`Problema: ${fmt.escape(job.problem_description)}\n` +
                     fmt`Estado: ${fmt.escape(job.current_status)}\n` +
                     fmt`Agendado el: ${job.created_at.toLocaleDateString()}\n\n`;
        });
      } else {
        message = "No tienes trabajos agendados. Usa /agendar para crear uno.";
      }
    }
    await ctx.reply(message);

  } catch (error) {
    console.error("Error in /estado command:", error);
    await ctx.reply("Lo siento, hubo un error al consultar el estado de los trabajos. Por favor, intenta de nuevo más tarde.");
  }
});

// /cotizar command - allows users to request a quote
bot.command("cotizar", async (ctx: MyContext) => {
  try {
    await ctx.reply(
      "Para obtener una cotización, por favor, describe el servicio que necesitas " +
      "o el problema de tu vehículo con el mayor detalle posible. " +
      "Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo pronto."
    );
  } catch (error) {
    console.error("Error in /cotizar command:", error);
    await ctx.reply("Lo siento, hubo un error al procesar tu solicitud de cotización. Por favor, intenta de nuevo más tarde.");
  }
});

// Export the bot instance so it can be used by the Vercel serverless function.
export { bot };
