import { PoolClient } from "pg";
import { SessionData } from "./_types";

export interface Job {
  job_id: number;
  telegram_user_id: number;
  telegram_chat_id: number;
  customer_name: string;
  customer_phone: string;
  vehicle_make_model: string;
  problem_description: string;
  current_status: string;
  progress_percentage: number;
  internal_notes: string | null;
  created_at: Date;
  updated_at: Date;
  scheduled_date: Date | null;
}

export interface JobEvent {
  id: number;
  job_id: number;
  event_type: string;
  event_data: Record<string, any>;
  created_at: Date;
}

export async function getNextJobId(client: PoolClient): Promise<number> {
  const res = await client.query<{ id: string }>("SELECT nextval('jobs_job_id_seq') as id");
  return parseInt(res.rows[0].id, 10);
}

export async function getSession(client: PoolClient, userId: number): Promise<SessionData> {
  const res = await client.query<{ data: SessionData }>("SELECT data FROM bot_sessions WHERE user_id = $1", [userId]);
  return res.rows[0]?.data ?? {};
}

export async function setSession(client: PoolClient, userId: number, data: SessionData): Promise<void> {
  await client.query(
    `INSERT INTO bot_sessions (user_id, data) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
    [userId, JSON.stringify(data)]
  );
}

export async function createJobEvent(client: PoolClient, jobId: number, eventType: string, eventData: Record<string, any>): Promise<JobEvent> {
  const res = await client.query<JobEvent>(
    `INSERT INTO job_events (job_id, event_type, event_data) VALUES ($1, $2, $3) RETURNING *`,
    [jobId, eventType, JSON.stringify(eventData)]
  );
  if (!res.rows[0]) throw new Error("Event creation failed");
  return res.rows[0];
}

export async function createJob(client: PoolClient, jobData: Omit<Job, 'job_id' | 'current_status' | 'progress_percentage' | 'internal_notes' | 'created_at' | 'updated_at'>, jobId?: number): Promise<Job> {
  const { telegram_user_id, telegram_chat_id, customer_name, customer_phone, vehicle_make_model, problem_description, scheduled_date } = jobData;
  const query = jobId
    ? `INSERT INTO jobs (job_id, telegram_user_id, telegram_chat_id, customer_name, customer_phone, vehicle_make_model, problem_description, scheduled_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`
    : `INSERT INTO jobs (telegram_user_id, telegram_chat_id, customer_name, customer_phone, vehicle_make_model, problem_description, scheduled_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
  const values = jobId ? [jobId, telegram_user_id, telegram_chat_id, customer_name, customer_phone, vehicle_make_model, problem_description, scheduled_date] : [telegram_user_id, telegram_chat_id, customer_name, customer_phone, vehicle_make_model, problem_description, scheduled_date];
  const res = await client.query<Job>(query, values);
  if (!res.rows[0]) throw new Error("Job creation failed");
  return res.rows[0];
}

export async function getJobById(client: PoolClient, jobId: number): Promise<Job | null> {
  const res = await client.query<Job>("SELECT * FROM jobs WHERE job_id = $1", [jobId]);
  return res.rows[0] ?? null;
}

export async function listJobs(client: PoolClient, filters: { telegram_chat_id: number }): Promise<Job[]> {
  const res = await client.query<Job>("SELECT * FROM jobs WHERE telegram_chat_id = $1 ORDER BY created_at DESC", [filters.telegram_chat_id]);
  return res.rows;
}