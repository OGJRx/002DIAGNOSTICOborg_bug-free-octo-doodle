# Plantilla de Bot de Telegram para Vercel

Esta es una plantilla para desplegar un bot de Telegram usando [grammY](https://grammy.dev/) en [Vercel](https://vercel.com) con cero configuración.

## Configuración

### 1. Obtener el Token del Bot
Habla con [@BotFather](https://t.me/BotFather) en Telegram para crear un nuevo bot. Te proporcionará un token único.

### 2. Configurar Variables de Entorno
Necesitas configurar el token de tu bot como una variable de entorno en Vercel.

- **Nombre de la Variable**: `TELEGRAM_BOT_TOKEN`
- **Valor**: El token que obtuviste del BotFather.

Puedes añadir esta variable en la configuración de tu proyecto en Vercel, en la sección `Settings` > `Environment Variables`.

## Despliegue en Vercel

1.  **Crea un repositorio en GitHub, GitLab o Bitbucket** con los archivos de este proyecto.
2.  **Importa el proyecto en Vercel**. Vercel detectará automáticamente que es un proyecto con `@vercel/node` y lo configurará por ti.
3.  **Añade la variable de entorno** `TELEGRAM_BOT_TOKEN` como se describe arriba.
4.  **Despliega**. Vercel te dará una URL de despliegue (por ejemplo, `https://tu-proyecto.vercel.app`).

## Conectar Telegram a Vercel (Configurar el Webhook)

Una vez que tu proyecto esté desplegado, necesitas decirle a Telegram a dónde enviar las actualizaciones (los mensajes que recibe tu bot).

Abre tu navegador y visita la siguiente URL, reemplazando los valores correspondientes:

```
https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook?url=<TU_URL_DE_VERCEL>/api
```

-   `<TU_BOT_TOKEN>`: El token de tu bot.
-   `<TU_URL_DE_VERCEL>`: La URL que Vercel te proporcionó.

**Ejemplo:**
```
https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/setWebhook?url=https://mi-bot.vercel.app/api
```

Si todo va bien, Telegram responderá con: `{"ok":true,"result":true,"description":"Webhook was set"}`.

¡Y listo! Tu bot ya está funcionando en Vercel.

## Desarrollo Local

1.  **Instala la CLI de Vercel**:
    ```bash
    npm install -g vercel
    ```

2.  **Crea un archivo `.env`** en la raíz del proyecto y añade tu token:
    ```
    TELEGRAM_BOT_TOKEN="tu-token-aqui"
    ```

3.  **Inicia el servidor de desarrollo**:
    ```bash
    vercel dev
    ```
    El comando `vercel dev` cargará las variables de tu archivo `.env` y simulará el entorno de Vercel en tu máquina local.
