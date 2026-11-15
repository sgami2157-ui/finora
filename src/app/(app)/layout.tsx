import { supabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: biz } = await sb.from("businesses").select("id,name").is("deleted_at", null).limit(1).maybeSingle();
  return (
    <div className="shell">
      <Sidebar businessName={biz?.name ?? null} />
      <main className="main">{children}</main>
    </div>
  );
}
