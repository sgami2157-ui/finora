"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ReverseButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm("Balik jurnal ini? Jurnal pembalik akan dibuat; jurnal asli tidak dihapus.")) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("reverse_journal_entry", { p_entry: id });
    setBusy(false);
    if (error) alert(error.message); else router.refresh();
  }
  return <button onClick={run} disabled={busy}>Balik</button>;
}
