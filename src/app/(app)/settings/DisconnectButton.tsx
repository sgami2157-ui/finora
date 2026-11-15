"use client";
import { useRouter } from "next/navigation";

export default function DisconnectButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  async function run() {
    if (!confirm("Putuskan Google Drive? File yang sudah ada di Drive tidak dihapus.")) return;
    const res = await fetch("/api/google/disconnect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ business: businessId }) });
    if (!res.ok) alert("Gagal memutuskan koneksi"); else router.refresh();
  }
  return <button onClick={run}>Putuskan koneksi</button>;
}
