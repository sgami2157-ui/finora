import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const k = process.env.TOKEN_ENCRYPTION_KEY;
  if (!k) throw new Error("TOKEN_ENCRYPTION_KEY belum diset");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY harus 32 byte (base64)");
  return buf;
}

/** AES-256-GCM. Format: base64(iv[12] | tag[16] | ciphertext). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}
