import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import type { Update } from 'grammy/types';

// Esta variable contendrá la instancia del bot después de mockear las variables de entorno.
let bot: any;
// Declaramos el "spy" para `sendMessage` fuera de los hooks para que sea accesible.
let sendMessageSpy: ReturnType<typeof vi.spyOn>;

describe('Bot Commands', () => {

  // Este hook se ejecuta una vez antes de todas las pruebas en este bloque 'describe'.
  beforeAll(async () => {
    // 1. Mockeamos la variable de entorno ANTES de que se cargue cualquier módulo que la use.
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test_token_123');

    // 2. Importamos dinámicamente _bot DESPUÉS de que la variable de entorno esté mockeada.
    const mod = await import('./_bot');
    bot = mod.bot;

    // 3. Mockeamos la llamada a la API `getMe` *antes* de que `bot.init()` la realice.
    vi.spyOn(bot.api, 'getMe').mockResolvedValue({
      id: 123456789,
      is_bot: true,
      first_name: 'TestBot',
      username: 'test_bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    });

    // 4. Inicializamos el bot explícitamente. Ahora `bot.init()` debería tener éxito.
    await bot.init();

    // 5. Espiamos el método `sendMessage` *después* de que el bot esté inicializado.
    sendMessageSpy = vi.spyOn(bot.api, 'sendMessage');
  });

  // Este hook se ejecuta después de cada prueba individual.
  afterEach(() => {
    sendMessageSpy.mockClear();
  });

  // Este hook se ejecuta una vez después de todas las pruebas en este bloque 'describe'.
  afterAll(() => {
    vi.unstubAllEnvs();
    // Ahora `sendMessageSpy` debería estar definido y `mockRestore` funcionará.
    sendMessageSpy.mockRestore();
  });

  // La prueba específica para el comando /start
  it('should reply with a welcome message on /start command', async () => {
    const fakeUpdate: Update = {
      update_id: 1,
      message: {
        message_id: 1,
        date: Date.now(),
        chat: { id: 12345, type: 'private', first_name: 'Test' },
        text: '/start',
        from: { id: 12345, is_bot: false, first_name: 'Test' },
        entities: [{ type: 'bot_command', offset: 0, length: 6 }],
      },
    };

    await bot.handleUpdate(fakeUpdate);

    expect(sendMessageSpy).toHaveBeenCalledOnce();
    expect(sendMessageSpy).toHaveBeenCalledWith(
      12345, // chat_id
      '¡Hola! Soy un bot de Telegram desplegado en Vercel. ¡Listo para automatizar!', // text
      undefined // No hay opciones adicionales pasadas a reply en este caso
    );
  });
});
