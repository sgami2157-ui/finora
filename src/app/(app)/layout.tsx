import ScrollTop from "@/components/ScrollTop";
import { supabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import QuickAdd from "@/components/QuickAdd";
import AppBar from "@/components/AppBar";
import WhatsNew from "@/components/WhatsNew";
import IdleGuard from "@/components/IdleGuard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: biz } = await sb.from("businesses").select("id,name").is("deleted_at", null).limit(1).maybeSingle();
  const { data: u } = await sb.auth.getUser();
  return (
    <div className="shell">
      <a href="#main" className="skip">Lewati ke konten</a>
      <Sidebar businessName={biz?.name ?? null} userEmail={u.user?.email ?? null} />
      <main className="main" id="main">
        <AppBar />
        <WhatsNew />
        {children}
      </main>
      {biz && <QuickAdd />}
      <ScrollTop />
      <IdleGuard />
    </div>
  );
}
