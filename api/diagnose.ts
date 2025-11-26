import type { VercelRequest, VercelResponse } from "@vercel/node";
import { lookup } from "dns";
import { promises as dnsPromises } from "dns";
import { Pool } from "pg";

// This is more robust than a hardcoded value.
const HOSTNAME = process.env.POSTGRES_URL
  ? new URL(process.env.POSTGRES_URL).hostname
  : "db.xxtqogexrxjpnaipcigi.supabase.co"; // fallback for safety

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let dnsResult;

  // 1. Perform a diagnostic DNS lookup (forced to IPv4)
  try {
    const { address, family } = await dnsPromises.lookup(HOSTNAME, {
      family: 4,
    });
    dnsResult = {
      message: "Diagnostic DNS lookup successful (forced IPv4)",
      address,
      family,
      hostname: HOSTNAME,
    };
  } catch (err) {
    console.error("Diagnostic DNS lookup FAILED. Error details:", err);
    return res.status(500).json({
      error: "Diagnostic DNS lookup failed",
      details: err,
      hostname: HOSTNAME,
    });
  }

  // 2. Check for POSTGRES_URL env var
  if (!process.env.POSTGRES_URL) {
    return res.status(500).json({
      dns: dnsResult,
      error: "Database connection test failed",
      details: "POSTGRES_URL environment variable is not set.",
    });
  }
  console.log("POSTGRES_URL is present");

  // 3. Initialize the Pool with the IPv4-forcing lookup function
  console.log(
    "Initializing new Pool with SSL config and custom IPv4 lookup..."
  );
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    /**
     * This is the critical fix. The pg Pool uses its own DNS lookup internally.
     * We provide a custom lookup function that forces IPv4 resolution, bypassing
     * potential IPv6 routing issues in the Vercel Serverless environment.
     *
     * We use `@ts-ignore` because the `lookup` property is not officially
     * part of the `PoolConfig` type definition in `@types/pg`, even though it is
     * a valid and supported property for the underlying node-postgres driver.
     */
    // @ts-ignore
    lookup: (
      hostname: string,
      callback: (
        err: NodeJS.ErrnoException | null,
        address: string,
        family: number
      ) => void
    ) => {
      lookup(hostname, { family: 4 }, (err, address, family) => {
        callback(err, address, family);
      });
    },
  });

  // 4. Attempt to connect to the database
  console.log("Pool initialized. Attempting to connect...");
  let client;
  try {
    client = await pool.connect();
    console.log("pool.connect() succeeded.");
    return res.status(200).json({
      dns: dnsResult,
      database: {
        status: "success",
        message: "Database connection successful.",
      },
    });
  } catch (dbErr) {
    console.error("pool.connect() FAILED. Error details:", dbErr);
    return res.status(500).json({
      dns: dnsResult,
      error: "Database connection test failed",
      details: dbErr,
    });
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}
