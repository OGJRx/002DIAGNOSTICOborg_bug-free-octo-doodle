import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function testDbConnection() {
  if (!process.env.POSTGRES_URL) {
    console.error("Error: POSTGRES_URL environment variable is not set.");
    process.exit(1);
  }

  console.log("Attempting to connect to the database...");

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  let client;
  try {
    client = await pool.connect();
    console.log("Database connection successful!");
    const res = await client.query("SELECT NOW()");
    console.log("Current time from DB:", res.rows[0].now);
  } catch (err) {
    console.error("Database connection failed:", err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log("Connection pool closed.");
  }
}

testDbConnection();
