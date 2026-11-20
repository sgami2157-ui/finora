import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";
const ACTION: Record<string, string> = { INSERT: "Dibuat", UPDATE: "Diubah", DELETE: "Dihapus" };
const TONE: Record<string, "pos" | "warn" | "neg"> = { INSERT: "pos", UPDATE: "warn", DELETE: "neg" };

export default async function ActivityPage() {
  const biz = await getBusiness();
  if (!biz) return <Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty>;
  const sb = await supabaseServer();
  // RLS: hanya pemilik/admin yang bisa membaca audit_logs; peran lain mendapat daftar kosong.
  const { data } = await sb.from("audit_logs").select("id,table_name,action,record_id,user_id,created_at")
    .eq("business_id", biz.id).order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  const fmt = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso));
  return (
    <>
      <PageHead title="Log Aktivitas" desc="100 perubahan data terakhir. Hanya terlihat oleh pemilik dan admin." />
      <Panel title="Riwayat perubahan">
        {rows.length === 0 ? <p className="muted">Belum ada aktivitas yang tercatat, atau Anda tidak memiliki akses.</p> : (
          <ul className="rows">
            {rows.map((r) => (
              <li key={r.id} className="row-card"><div className="row-main">
                <div><strong>{r.table_name}</strong><small className="sub">{fmt(r.created_at)} · pengguna {r.user_id ? String(r.user_id).slice(0, 8) : "sistem"}</small></div>
                <Badge tone={TONE[r.action] ?? "muted"}>{ACTION[r.action] ?? r.action}</Badge>
              </div></li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
