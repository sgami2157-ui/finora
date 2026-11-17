import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import { loadHealth } from "@/lib/health";
import AiChat from "@/components/AiChat";
import { Empty, PageHead, Panel } from "@/components/ui";
import { Insights } from "@/components/Insights";

export default async function AiPage() {
  const biz = await getBusiness();
  if (!biz) return (<><PageHead title="AI Financial Analyst" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);
  const sb = await supabaseServer();
  const [health, hist] = await Promise.all([
    loadHealth(biz.id),
    sb.from("ai_conversations").select("role,content,created_at").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const initial = ((hist.data ?? []) as { role: "user" | "assistant"; content: string }[]).reverse().map((m) => ({ role: m.role, content: m.content }));
  return (
    <>
      <PageHead title="AI Financial Analyst" desc="Pahami kondisi keuangan usaha Anda dengan bahasa sederhana, lalu tanya apa saja." />
      <Panel title="Wawasan otomatis" desc="Dihitung langsung dari data Anda (bukan AI), diperbarui setiap halaman dibuka">
        <Insights items={health.insights} />
      </Panel>
      <Panel title="Tanya analis AI" className="mt"><AiChat businessId={biz.id} initial={initial} /></Panel>
    </>
  );
}
