import type { VercelRequest, VercelResponse } from "@vercel/node";
import { lookup } from "dns";

const HOSTNAME = "db.xxtqogexrxjpnaipcigi.supabase.co";

export default function handler(req: VercelRequest, res: VercelResponse) {
  lookup(HOSTNAME, (err, address, family) => {
    if (err) {
      res.status(500).json({
        error: "DNS lookup failed",
        details: err,
        hostname: HOSTNAME,
      });
    } else {
      res.status(200).json({
        message: "DNS lookup successful",
        address,
        family,
        hostname: HOSTNAME,
      });
    }
  });
}
