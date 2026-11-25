"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { toast } from "@/lib/toast";

export type BusinessType = "umum" | "fnb";
const OPTS: { id: BusinessType; label: string }[] = [{ id: "umum", label: "Umum" }, { id: "fnb", label: "Makanan & Minuman" }];

/** Pilihan jenis usaha. Mode Makanan & Minuman menampilkan saran takaran bahan di Produk & Persediaan. Hanya pemilik/admin yang bisa mengubah. */
export default function BusinessTypeSwitch({ businessId, value }: { businessId: string; value: BusinessType }) {
  const router = useRouter();
  const [v, setV] = useState<BusinessType>(value);
  const [busy, setBusy] = useState(false);
  async function pick(next: BusinessType) {
    if (next === v || busy) return;
    setBusy(true);
    const { data, error } = await supabaseBrowser().from("business_settings").update({ business_type: next }).eq("business_id", businessId).select("business_type");
    setBusy(false);
    if (error) return toast(friendlyError(error.message), "err");
    if (!data || data.length === 0) return toast("Hanya pemilik atau admin yang dapat mengubah jenis usaha.", "err");
    setV(next); toast(next === "fnb" ? "Mode Makanan & Minuman aktif." : "Mode Umum aktif."); router.refresh();
  }
  return (
    <div className="seg-switch" role="radiogroup" aria-label="Jenis usaha">
      {OPTS.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={v === o.id} className={v === o.id ? "on" : ""} disabled={busy} onClick={() => pick(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}
