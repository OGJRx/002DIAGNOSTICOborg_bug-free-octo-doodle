import { Bot } from "grammy";
import { fmt } from "@grammyjs/parse-mode";
import * as fs from "fs";
import { isAdmin } from "./_middlewares";
import * as path from "path";
import * as yaml from "js-yaml";
import {
  getSession,
  setSession,
  getJobById,
  listJobs,
  createJob,
  createJobEvent,
  getNextJobId,
} from "./_db";
import { MyContext } from "./_types";
import { logger } from "./_logger";

interface FlowStep {
  prompt: string;
  persist_as?: string;
  transition_to?: string;
  transition_on_positive?: string;
  transition_on_negative?: string;
}

interface Flow {
  initial_step: string;
  steps: Record<string, FlowStep>;
}

const flowPath = path.join(process.cwd(), "flows", "agendar.yaml");
const flow = yaml.load(fs.readFileSync(flowPath, "utf8")) as Flow;

export function setupBot(bot: Bot<MyContext>) {
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      ctx.session = await getSession(ctx.db, ctx.from.id);
      await next();
      await setSession(ctx.db, ctx.from.id, ctx.session);
    }
  });

  bot.command("start", async (ctx) => {
    await ctx.reply("¡Hola! Soy DIAGNÓSTICO BORG. ¡Listo para automatizar!");
  });

  bot.command("admin", isAdmin, async (ctx) => {
    await ctx.reply("Welcome, admin! Here are the admin commands...");
  });

  bot.command("agendar", (ctx) => {
    ctx.session.current_step = flow.initial_step;
    ctx.session.flow_data = {};
    const initialStep = flow.steps[flow.initial_step];
    if (initialStep) {
      ctx.reply(initialStep.prompt);
    }
  });

  bot.on("message:text", async (ctx) => handleFlowLogic(ctx));
}

async function commitFlowData(ctx: MyContext) {
  if (!ctx.chat?.id || !ctx.from?.id || !ctx.session.flow_data) {
    await ctx.reply("Error: No se pudo obtener la información del usuario o de la sesión.");
    return;
  }

  const jobData = {
    telegram_user_id: ctx.from.id,
    telegram_chat_id: ctx.chat.id,
    customer_name: ctx.session.flow_data.customer_name,
    customer_phone: ctx.session.flow_data.customer_phone,
    vehicle_make_model: ctx.session.flow_data.vehicle_make_model,
    problem_description: ctx.session.flow_data.problem_description,
    scheduled_date: ctx.session.flow_data.scheduled_date,
  };

  try {
    await ctx.db.query("BEGIN");
    const jobId = await getNextJobId(ctx.db);
    await createJobEvent(ctx.db, jobId, "JOB_SCHEDULED", ctx.session.flow_data);
    const newJob = await createJob(ctx.db, jobData, jobId);
    await ctx.db.query("COMMIT");
    await ctx.reply(`¡Gracias! Tu cita ha sido agendada. Referencia: #${newJob.job_id}.`);
  } catch (error) {
    logger.error("Error committing flow data", { error, telegramUserId: ctx.from.id });
    await ctx.db.query("ROLLBACK");
    await ctx.reply("Lo siento, hubo un error al guardar tu cita.");
  } finally {
    ctx.session.current_step = undefined;
    ctx.session.flow_data = {};
  }
}

async function cancelFlow(ctx: MyContext) {
  const cancelStep = flow.steps["__CANCEL__"];
  if (cancelStep) {
    await ctx.reply(cancelStep.prompt);
  }
  ctx.session.current_step = undefined;
  ctx.session.flow_data = {};
}

async function handleNextStepPrompt(ctx: MyContext, nextStepKey: string) {
  const nextStep = flow.steps[nextStepKey];
  if (!nextStep) return;

  let prompt = nextStep.prompt;
  if (ctx.session.flow_data) {
    Object.keys(ctx.session.flow_data).forEach((key) => {
      prompt = prompt.replace(`{${key}}`, ctx.session.flow_data?.[key] ?? "");
    });
  }
  await ctx.reply(prompt);
}

function determineNextStep(currentStep: FlowStep, currentStepKey: string, input: string): string | undefined {
  if (currentStepKey === "CONFIRMATION") {
    return input.toLowerCase() === "sí"
      ? currentStep.transition_on_positive
      : currentStep.transition_on_negative;
  }
  return currentStep.transition_to;
}

async function handleFlowLogic(ctx: MyContext) {
  if (!ctx.message?.text) return;

  const currentStepKey = ctx.session.current_step;
  if (!currentStepKey || !flow.steps[currentStepKey]) return;

  const currentStep = flow.steps[currentStepKey];
  const input = ctx.message.text.trim();
  if (!ctx.session.flow_data) {
    ctx.session.flow_data = {};
  }

  if (currentStep.persist_as) {
    ctx.session.flow_data[currentStep.persist_as] = input;
  }

  const nextStepKey = determineNextStep(currentStep, currentStepKey, input);
  ctx.session.current_step = nextStepKey;

  if (!nextStepKey) return;

  switch (nextStepKey) {
    case "__COMMIT__":
      await commitFlowData(ctx);
      break;
    case "__CANCEL__":
      await cancelFlow(ctx);
      break;
    default:
      await handleNextStepPrompt(ctx, nextStepKey);
      break;
  }
}