import type { VercelRequest, VercelResponse } from "@vercel/node";
import { lookup } from "dns";
import { Pool } from "pg";

const HOSTNAME = "db.xxtqogexrxjpnaipcigi.supabase.co";

export default function handler(req: VercelRequest, res: VercelResponse) {
  lookup(HOSTNAME, async (err, address, family) => {
    if (err) {
      return res.status(500).json({
        error: "DNS lookup failed",
        details: err,
        hostname: HOSTNAME,
      });
    }

    const dnsResult = {
      message: "DNS lookup successful",
      address,
      family,
      hostname: HOSTNAME,
    };

    if (!process.env.POSTGRES_URL) {
      return res.status(500).json({
        dns: dnsResult,
        error: "Database connection test failed",
        details: "POSTGRES_URL environment variable is not set.",
      });
    }

    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      // Required for Vercel to connect to Supabase DB
      ssl: {
        rejectUnauthorized: false,
      },
    });
    let client;
    try {
      client = await pool.connect();
      res.status(200).json({
        dns: dnsResult,
        database: {
          status: "success",
          message: "Database connection successful.",
        },
      });
    } catch (dbErr) {
      res.status(500).json({
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
  });
}
