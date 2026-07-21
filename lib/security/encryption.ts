import "server-only";
import crypto from "node:crypto";
import { ApiError } from "@/lib/security/api";

function key() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new ApiError("missing_configuration", "APP_ENCRYPTION_KEY is not configured.");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new ApiError("missing_configuration", "APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return decoded;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new ApiError("server_error", "Encrypted credential is invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
