import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toCsv } from "@/lib/csv";
import { accessTokenFor, ensureFolder, uploadFile } from "@/lib/google";

const TABLES = ["accounts", "journal_entries", "journal_lines", "customers", "suppliers", "products", "invoices", "payments", "inventory_movements"] as const;

async function dump(db: SupabaseClient, table: string, businessId: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("*").eq("business_id", businessId).order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, from + 999);
    if (error) { if (/does not exist|schema cache/i.test(error.message)) return []; throw new Error(`${table}: ${error.message}`); }
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export type BackupResult = { folder: string; files: number; rows: Record<string, number>; verified: boolean };

/** Ekspor CSV semua tabel bisnis ke Drive: FINORA/<Bisnis>/Backup/<waktu>/. Status "verified" hanya jika ukuran file di Drive = ukuran yang dikirim. */
export async function runBackup(db: SupabaseClient, admin: SupabaseClient, businessId: string, businessName: string, userId: string | null): Promise<BackupResult> {
  const token = await accessTokenFor(businessId);
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const root = await ensureFolder(token, "FINORA");
  const biz = await ensureFolder(token, businessName, root);
  const bk = await ensureFolder(token, "Backup", biz);
  const folder = await ensureFolder(token, stamp, bk);

  const rows: Record<string, number> = {}; const sums: Record<string, string> = {}; let ok = true; let files = 0;
  try {
    for (const t of TABLES) {
      const data = await dump(db, t, businessId);
      rows[t] = data.length;
      const csv = toCsv(data); const bytes = Buffer.from(csv, "utf8");
      sums[t] = createHash("sha256").update(bytes).digest("hex");
      const up = await uploadFile(token, folder, `${t}.csv`, "text/csv", bytes);
      files++; if (up.size !== bytes.length) ok = false;
    }
    const manifest = Buffer.from(JSON.stringify({ app: "FINORA", business: businessName, created_at: new Date().toISOString(), rows, sha256: sums }, null, 2), "utf8");
    const mf = await uploadFile(token, folder, "manifest.json", "application/json", manifest);
    files++; if (mf.size !== manifest.length) ok = false;
    await admin.from("backup_logs").insert({ business_id: businessId, kind: "backup", status: ok ? "verified" : "failed", checksum_sha256: createHash("sha256").update(manifest).digest("hex"), row_counts: rows, drive_file_id: folder, detail: ok ? null : "Ukuran file di Drive tidak cocok", created_by: userId });
  } catch (e) {
    await admin.from("backup_logs").insert({ business_id: businessId, kind: "backup", status: "failed", row_counts: rows, drive_file_id: folder, detail: (e as Error).message.slice(0, 300), created_by: userId });
    throw e;
  }
  return { folder, files, rows, verified: ok };
}
