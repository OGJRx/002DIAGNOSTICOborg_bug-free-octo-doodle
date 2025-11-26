# DIAGNÓSTICO BORG - Plantilla de Bot de Telegram para Vercel

Esta plantilla implementa un bot de Telegram avanzado para la automatización de talleres automotrices, desplegable en Vercel. Está diseñado para ofrecer una solución de bajo coste ($0) para la gestión de citas y el seguimiento de trabajos, con una base sólida para una futura Mini App de gestión interna.

## 🚀 Capacidades Actuales y Potencial de Despliegue

El bot DIAGNÓSTICO BORG ofrece las siguientes funcionalidades clave, accesibles mediante comandos de Telegram:

*   `/start`: Mensaje de bienvenida inicial y presentación del bot.
*   `/agendar`: Un flujo conversacional paso a paso que guía al usuario para agendar una cita. Recopila la siguiente información:
    *   Nombre del Cliente
    *   Número de Teléfono
    *   Marca y Modelo del Vehículo
    *   Descripción del Problema/Servicio
    *   Fecha Deseada para la Cita
    Los datos se persisten de forma segura en una base de datos PostgreSQL.
*   `/estado`: Permite a los usuarios consultar el estado de sus trabajos. Pueden hacerlo proporcionando un ID de trabajo específico (`/estado [ID_DE_TRABAJO]`) o listando todos los trabajos asociados a su cuenta de Telegram. La información se obtiene directamente de la base de datos.
*   `/cotizar` - **Solicitud de Cotización Inicial (Lógica Avanzada en Desarrollo):** Un comando para que los usuarios soliciten una cotización. Actualmente, el bot solicita al usuario que describa su necesidad en detalle, sentando las las bases para futuras implementaciones de lógica de precios más sofisticada.

## 🏛️ Arquitectura

La arquitectura de DIAGNÓSTICO BORG se basa en dos principios fundamentales: **Event Sourcing** y **Dependency Injection**, diseñados para máxima robustez, testabilidad y escalabilidad en un entorno serverless.

*   **Event Sourcing:** En lugar de modificar directamente el estado de los trabajos (el "read model"), cada cambio se registra como un evento inmutable en la tabla `job_events`. Esto proporciona un historial de auditoría completo y permite reconstruir el estado de cualquier trabajo en cualquier momento.
*   **Dependency Injection (`AppContext`):** La aplicación utiliza un patrón de inyección de dependencias a través de un `AppContext`. Este contexto, creado en `api/_context.ts`, contiene las instancias de la base de datos (`Pool`) y del bot (`Bot`). Los manejadores y la lógica de negocio reciben este contexto como un parámetro, lo que los desacopla de las implementaciones concretas y facilita enormemente las pruebas.

## 🛠️ Stack Tecnológico

*   **Lenguaje:** TypeScript
*   **Plataforma de Despliegue:** Vercel Serverless Functions
*   **Framework del Bot:** [grammY](https://grammy.dev/)
*   **Base de Datos:** PostgreSQL (con [Supabase](https://supabase.io/) como proveedor recomendado para el tier gratuito)
*   **ORM/Cliente DB:** `node-postgres` (`pg`)

## ⚙️ Guía de Despliegue para DevOps

Sigue estos pasos para desplegar y configurar el bot DIAGNÓSTICO BORG en tu entorno de Vercel:

### 1. Configuración de la Base de Datos (Supabase)

El bot utiliza PostgreSQL para persistir los datos de trabajos y sesiones.

*   **1.1 Crear Proyecto en Supabase:** Crea un nuevo proyecto en Supabase (o tu proveedor de PostgreSQL preferido).
*   **1.2 Obtener `DATABASE_URL`:** Una vez creado el proyecto, ve a `Project Settings` > `Database` > `Connection String` para obtener la URL de conexión de tu base de datos.
*   **1.3 Aplicar Esquema SQL:** Ejecuta el esquema de base de datos en tu editor SQL de Supabase (o herramienta de gestión de DB).
    *   **Archivo del Esquema:** `api/schema.sql` (disponible en este repositorio).
    *   Este esquema define:
        *   `job_status` ENUM con estados como `LEAD`, `AGENDADO`, `EN_REVISION`, etc.
        *   La tabla `jobs` con campos para datos del cliente, vehículo, descripción del problema, estado (`current_status`), porcentaje de progreso (`progress_percentage`), notas internas (`internal_notes`) y fecha agendada (`scheduled_date`).

### 2. Configuración del Proyecto en Vercel

*   **2.1 Importar Repositorio:** Conecta tu cuenta de Vercel con tu proveedor de Git (GitHub, GitLab, Bitbucket) e importa este repositorio.
*   **2.2 Configurar Variables de Entorno Críticas:** Añade las siguientes variables de entorno en la configuración de tu proyecto Vercel (en `Settings` > `Environment Variables`). Asegúrate de que estén disponibles para los entornos de `Production`, `Preview` y `Development`.

    *   `TELEGRAM_BOT_TOKEN`:
        *   **Descripción:** Token único de autenticación de tu bot, obtenido de [@BotFather](https://t.me/BotFather) en Telegram.
        *   **Valor:** `TU_TOKEN_DE_BOT`
    *   `DATABASE_URL`:
        *   **Descripción:** URL de conexión a tu base de datos PostgreSQL.
        *   **Valor:** La URL obtenida en el paso `1.2` de la configuración de la DB.
    *   `STAFF_IDS`:
        *   **Descripción:** Lista de IDs de usuario de Telegram autorizados para acceder a futuras funcionalidades de gestión interna (Mini App). **CRÍTICO para la seguridad de la Mini App.**
        *   **Valor:** IDs numéricos de Telegram separados por comas (ej: `123456789,987654321`). Para obtener tu ID, puedes usar bots como [@Userinfobot](https://t.me/Userinfobot).
    *   `VERCEL_URL`:
        *   **Descripción:** La URL pública de tu proyecto Vercel (generada automáticamente por Vercel, pero vital para el webhook).
        *   **Valor:** `https://tu-proyecto.vercel.app` (Vercel lo inyecta automáticamente en producción).

### 3. Despliegue y Configuración Automatizada del Webhook

Una vez configuradas las variables de entorno y con la base de datos lista:

*   **Despliega el proyecto en Vercel.** Después del despliegue, Vercel ejecutará automáticamente el script `scripts/set-webhook.ts` (`npm run postbuild` -> `npm run set-webhook`).
*   **Verificación y Configuración Manual del Webhook (Si es Necesario):** Si el webhook automático falla (ej. `TELEGRAM_BOT_TOKEN` o `VERCEL_URL` no estaban disponibles en el momento del despliegue) o necesitas configurarlo/verificarlo manualmente, sigue estos pasos:
    1.  **Obtén la URL de tu despliegue:** La URL base de tu proyecto Vercel (ej. `https://diagnsticoborg.vercel.app`).
    2.  **Forma la URL del Webhook:** Tu webhook debe apuntar a la ruta `/api` de tu despliegue Vercel. La URL correcta será `https://<TU_URL_DE_VERCEL>/api`. Asegúrate de que **NO HAYA ESPACIOS EXTRA** antes o después de `/api`.
    3.  **Configura el Webhook:** Abre esta URL en tu navegador (sustituyendo `<TU_TOKEN_DE_BOT>` y `<TU_URL_DE_VERCEL>`):
        ```
        https://api.telegram.org/bot<TU_TOKEN_DE_BOT>/setWebhook?url=https://<TU_URL_DE_VERCEL>/api
        ```
        Ejemplo: `https://api.telegram.org/bot123456:ABC...XYZ/setWebhook?url=https://diagnsticoborg.vercel.app/api`
    4.  **Verifica el Estado del Webhook:** Para confirmar que el webhook se configuró correctamente y verificar si hay errores, abre esta URL en tu navegador:
        ```
        https://api.telegram.org/bot<TU_TOKEN_DE_BOT>/getWebhookInfo
        ```
        Busca el campo `url` en la respuesta JSON. Debe coincidir exactamente con `https://<TU_URL_DE_VERCEL>/api`. Si `last_error_message` está presente, indica problemas en la entrega de actualizaciones.
        **¡ADVERTENCIA CRÍTICA!** Un error común es incluir un espacio extra en la URL, como `https://<TU_URL_DE_VERCEL>/ /api`. Este espacio generará un error `404 Not Found` por parte de Vercel y hará que tu bot no funcione. Asegúrate de que la URL sea `https://<TU_URL_DE_VERCEL>/api`.

## 🔒 Seguridad y Rendimiento

*   **Arquitectura Stateless:** El bot opera sin estado persistente en los servidores de Vercel, delegando toda la gestión de estado a PostgreSQL, lo que mejora la escalabilidad y el rendimiento.
*   **Protección contra Inyección:** Todas las interacciones con la base de datos utilizan *prepared statements* para prevenir ataques de inyección SQL.
*   **Validación y Escapado:** Se implementa validación básica de entradas de usuario y escapado de Markdown en las salidas del bot para mitigar riesgos.
*   **Control de Acceso (Mini App):** La variable `STAFF_IDS` establece una base para el control de acceso de usuarios privilegiados, esencial para la seguridad de la futura Mini App de gestión.

## 💻 Desarrollo Local

Para desarrollar y probar el bot localmente:

1.  **Instala la CLI de Vercel:** `npm install -g vercel`
2.  **Crea un archivo `.env`** en la raíz del proyecto. Copia y pega las variables de entorno críticas definidas en la sección `2.2` de Despliegue, sustituyendo los valores. Asegúrate de incluir `TELEGRAM_BOT_TOKEN`, `DATABASE_URL` y `STAFF_IDS`.
3.  **Inicia el servidor de desarrollo:** `vercel dev`
    *   `vercel dev` cargará las variables de tu archivo `.env` y simulará el entorno de Vercel en tu máquina local.

## Security & Data Flow

*   **`initData` Validation (HMAC-SHA-256):** Securely validates data from the Telegram Mini App.
*   **Prepared Statements:** Prevents SQL injection vulnerabilities.
*   **`STAFF_IDS` Access Control:** Restricts access to authorized staff members.
