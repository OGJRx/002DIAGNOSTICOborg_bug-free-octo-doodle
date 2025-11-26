import type { VercelRequest, VercelResponse } from "@vercel/node";
import { lookup } from "dns";
import { promises as dnsPromises } from "dns";
import { Pool } from "pg";
import { logger } from "./_logger";

// This is more robust than a hardcoded value.
const HOSTNAME = process.env.POSTGRES_URL
  ? new URL(process.env.POSTGRES_URL).hostname
  : "db.xxtqogexrxjpnaipcigi.supabase.co"; // fallback for safety

export default async function handler(req: VercelRequest, res: VercelResponse) {
  logger.info("Starting /api/diagnose execution.");
  logger.info(
    "POSTGRES_URL (redacted):",
    process.env.POSTGRES_URL?.replace(/:([^:]*)@/, ":****@")
  );
  logger.info("Resolved HOSTNAME from POSTGRES_URL:", HOSTNAME);

  // --- Sonda DNS para un hostname público (google.com) ---
  try {
    const { address: googleAddress, family: googleFamily } =
      await dnsPromises.lookup("google.com", { family: 4 });
    logger.info(
      `DNS lookup for google.com successful: ${googleAddress} (Family: ${googleFamily})`
    );
  } catch (googleDnsErr: any) {
    logger.error(
      "DNS lookup for google.com FAILED:",
      googleDnsErr.message || googleDnsErr.toString()
    );
  }
  // --- Fin Sonda DNS para google.com ---

  let dnsResult;
  // 1. Perform a diagnostic DNS lookup (forced to IPv4) for Supabase host
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
    logger.info("Diagnostic DNS lookup for Supabase host successful:", dnsResult);
  } catch (err: any) { // Capturar el error para logging detallado
    logger.error(
      "Diagnostic DNS lookup for Supabase host FAILED. Error details:",
      err.message || err.toString()
    );
    return res.status(500).json({
      error: "Diagnostic DNS lookup failed",
      details: err.message || err.toString(), // Solo el mensaje de error
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
