import "server-only";
import crypto from "node:crypto";
import { ApiError } from "@/lib/security/api";
export function requireCron(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new ApiError("missing_configuration", "CRON_SECRET is not configured.");
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const a=Buffer.from(expected), b=Buffer.from(supplied);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw new ApiError("unauthorized","Invalid cron authorization.");
}
