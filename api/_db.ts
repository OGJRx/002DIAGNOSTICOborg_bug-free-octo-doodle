import { Pool, PoolClient } from 'pg';

// Asegúrate de que la variable de entorno DATABASE_URL esté definida.
// En un entorno Vercel, esto se gestionaría a través de las variables de entorno de Vercel.
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("FATAL: DATABASE_URL no está configurado en las variables de entorno.");
}

// Configuración del pool de conexiones para PostgreSQL.
// Importante para entornos serverless para reutilizar conexiones.
const pool = new Pool({
  connectionString: DATABASE_URL,
  // Puedes ajustar otras opciones del pool según tus necesidades,
  // como max (número máximo de clientes en el pool) o idleTimeoutMillis.
  // En Vercel, es común que las funciones se "congelen" y "descongelen",
  // por lo que un tiempo de inactividad adecuado es importante.
  max: 10, // Número máximo de clientes en el pool
  idleTimeoutMillis: 30000, // Cerrar clientes inactivos después de 30 segundos
});

// Función de consulta genérica para interactuar con la base de datos.
export async function query(text: string, params: any[] = []) {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
}

// --- CRUD Operations for 'jobs' table ---

// Actualizamos la interfaz Job para que coincida con el esquema usado en api/_bot.ts
// Columnas inferidas de api/_bot.ts: telegram_user_id, telegram_chat_id, customer_name, customer_phone, vehicle_make_model, problem_description, current_status
export interface Job {
  id: number;
  telegram_user_id: number;
  telegram_chat_id: number;
  customer_name: string;
  customer_phone: string;
  vehicle_make_model: string;
  problem_description: string;
  current_status: 'LEAD' | 'AGENDADO' | 'EN_REVISION' | 'EN_REPARACION' | 'LISTO_PARA_ENTREGA' | 'COMPLETADO'; // Updated to full ENUM
  progress_percentage: number; // New
  internal_notes?: string; // New, can be null in DB
  created_at: Date;
  updated_at: Date;
  scheduled_date?: Date; // New, can be null in DB
}

export async function createJob(
  telegram_user_id: number,
  telegram_chat_id: number,
  customer_name: string,
  customer_phone: string,
  vehicle_make_model: string,
  problem_description: string,
  current_status: Job['current_status'] = 'LEAD', // Default to LEAD as per SQL schema
  scheduled_date: Date | null = null, // New parameter, default to null
  progress_percentage: number = 0, // New parameter, default to 0 as per SQL
  internal_notes: string | null = null // New parameter, default to null
): Promise<Job> {
  const sql = `
    INSERT INTO jobs (telegram_user_id, telegram_chat_id, customer_name, customer_phone, vehicle_make_model, problem_description, current_status, scheduled_date, progress_percentage, internal_notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING *;
  `;
  const values = [
    telegram_user_id,
    telegram_chat_id,
    customer_name,
    customer_phone,
    vehicle_make_model,
    problem_description,
    current_status,
    scheduled_date,
    progress_percentage,
    internal_notes,
  ];
  const res = await query(sql, values);
  return res.rows[0];
}

export async function getJobById(id: number): Promise<Job | null> {
  const sql = `SELECT * FROM jobs WHERE id = $1;`;
  const res = await query(sql, [id]);
  return res.rows[0] || null;
}

// Modificamos listJobs para permitir filtrar por current_status, user_id, o chat_id
export async function listJobs(
  options?: { status?: Job['current_status']; telegram_user_id?: number; telegram_chat_id?: number }
): Promise<Job[]> {
  let sql = `SELECT * FROM jobs`;
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (options?.status) {
    conditions.push(`current_status = $${paramIndex++}`);
    values.push(options.status);
  }
  if (options?.telegram_user_id) {
    conditions.push(`telegram_user_id = $${paramIndex++}`);
    values.push(options.telegram_user_id);
  }
  if (options?.telegram_chat_id) {
    conditions.push(`telegram_chat_id = $${paramIndex++}`);
    values.push(options.telegram_chat_id);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }
  sql += ` ORDER BY created_at DESC;`;
  const res = await query(sql, values);
  return res.rows;
}


export async function updateJobStatus(id: number, current_status: Job['current_status']): Promise<Job | null> {
  const sql = `
    UPDATE jobs
    SET current_status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const res = await query(sql, [current_status, id]);
  return res.rows[0] || null;
}

export async function updateJobProgress(id: number, progress_percentage: number): Promise<Job | null> {
  const sql = `
    UPDATE jobs
    SET progress_percentage = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const res = await query(sql, [progress_percentage, id]);
  return res.rows[0] || null;
}

export async function updateJobInternalNotes(id: number, internal_notes: string | null): Promise<Job | null> {
  const sql = `
    UPDATE jobs
    SET internal_notes = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const res = await query(sql, [internal_notes, id]);
  return res.rows[0] || null;
}

export async function deleteJob(id: number): Promise<boolean> {
  const sql = `DELETE FROM jobs WHERE id = $1 RETURNING id;`;
  const res = await query(sql, [id]);
  return res.rowCount > 0;
}

// Puedes añadir una función para cerrar el pool si fuera necesario,
// aunque en Vercel, las funciones lambda suelen gestionar esto automáticamente
// al finalizar la ejecución.
export async function endPool() {
  await pool.end();
  console.log('PostgreSQL connection pool has been closed.');
}

// Manejo de errores a nivel del pool (ej. si una conexión falla)
pool.on('error', (err: Error, client: PoolClient) => {
  console.error('Unexpected error on idle client', err);
  // Un error aquí podría indicar problemas de red o de la base de datos,
  // pero el pool intentará recuperar o crear nuevas conexiones.
});