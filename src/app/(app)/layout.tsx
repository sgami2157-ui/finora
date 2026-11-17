import { supabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import QuickAdd from "@/components/QuickAdd";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: biz } = await sb.from("businesses").select("id,name").is("deleted_at", null).limit(1).maybeSingle();
  return (
    <div className="shell">
      <a href="#main" className="skip">Lewati ke konten</a>
      <Sidebar businessName={biz?.name ?? null} />
      <main className="main" id="main">{children}</main>
      {biz && <QuickAdd />}
    </div>
  );
}
