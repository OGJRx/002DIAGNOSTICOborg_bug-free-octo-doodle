import { Bot } from "grammy";
import { Update, Message, User, Chat } from "grammy/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MyContext, SessionData } from "./_types";
import { Job, getSession, createJob, createJobEvent, getNextJobId } from "./_db";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

// Mock dependencies at the top level
vi.mock("fs");
vi.mock("js-yaml");
vi.mock("path");
vi.mock("./_db");
vi.mock("./_context");

// Configure mocks for fs, js-yaml, and path at the top level
const mockFlow = {
  initial_step: "AWAIT_NAME",
  steps: {
    AWAIT_NAME: { prompt: "Name?", persist_as: "customer_name", transition_to: "CONFIRMATION" },
    CONFIRMATION: { prompt: "Confirm?", transition_on_positive: "__COMMIT__", transition_on_negative: "__CANCEL__" },
    __COMMIT__: { prompt: "Thanks!" },
    __CANCEL__: { prompt: "Cancelled." },
  },
};
vi.mocked(fs.readFileSync).mockReturnValue("---");
vi.mocked(yaml.load).mockReturnValue(mockFlow);
vi.mocked(path.join).mockReturnValue("/mock/path/to/flow.yaml");


const mockBotInfo: User = {
  id: 42, is_bot: true, first_name: "Test Bot", username: "testbot",
};

const createMockContext = (text: string, isCommand = false) => {
  const from: User = { id: 123, is_bot: false, first_name: "Test" };
  const chat: Chat.PrivateChat = { id: 456, type: "private", first_name: "Test" };

  const message: Message.TextMessage = {
    text, message_id: 1, date: Date.now(), from, chat,
  };

  if (isCommand) {
    message.entities = [{ type: 'bot_command', offset: 0, length: text.length }];
  }
  const update: Update = { update_id: 1, message: message };
  return {
    update, message, from, chat,
    db: { query: vi.fn() }, reply: vi.fn(), match: ""
  } as unknown as MyContext;
};

describe("Bot Logic with Correct Mocking", () => {
  let bot: Bot<MyContext>;
  let setupBot: any;

  const simulateUpdate = (ctx: MyContext) => bot.middleware()(ctx);

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const botModule = await import("./_bot");
    setupBot = botModule.setupBot;

    bot = new Bot<MyContext>("test-token");
    vi.spyOn(bot.api, "getMe").mockResolvedValue(mockBotInfo);
    await bot.init();
    setupBot(bot);
  });

  test("should handle confirmation and be event-first", async () => {
    const finalSession: SessionData = {
      current_step: "CONFIRMATION",
      flow_data: { customer_name: "Jane Doe" },
    };
    const ctxFinal = createMockContext("Sí");
    vi.mocked(getSession).mockResolvedValueOnce(finalSession);

    const mockJobId = 123;
    const mockJob = { job_id: mockJobId } as Job;
    vi.mocked(getNextJobId).mockResolvedValue(mockJobId);
    vi.mocked(createJob).mockResolvedValue(mockJob);
    vi.mocked(createJobEvent).mockResolvedValue({} as any);

    await simulateUpdate(ctxFinal);

    const createJobEventCallOrder = vi.mocked(createJobEvent).mock.invocationCallOrder[0];
    const createJobCallOrder = vi.mocked(createJob).mock.invocationCallOrder[0];

    expect(createJobEventCallOrder).toBeLessThan(createJobCallOrder);
    expect(ctxFinal.reply).toHaveBeenCalledWith(expect.stringContaining(`#${mockJobId}`));
  });
});