import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getBalances, idr, sumBy, monthRange } from "@/lib/data";

async function createBusiness(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sb = await supabaseServer();
  const { error } = await sb.rpc("create_business", { p_name: name });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export default async function Dashboard() {
  const biz = await getBusiness();
  if (!biz) {
    return (
      <>
        <h1>Selamat datang</h1>
        <p>Buat bisnis pertama Anda. Bagan akun standar akan dibuat otomatis.</p>
        <form action={createBusiness} className="stack">
          <input name="name" placeholder="Nama bisnis" required />
          <button className="primary">Buat bisnis</button>
        </form>
      </>
    );
  }
  const { from, to } = monthRange();
  const [month, all] = await Promise.all([getBalances(biz.id, from, to), getBalances(biz.id, null, to)]);

  const revenue = sumBy(month, "revenue");
  const cogs = sumBy(month, "cogs");
  const expenses = sumBy(month, "expense");
  const gross = revenue - cogs;
  const net = gross - expenses;
  const cash = all.filter((r) => r.code === "1-1100" || r.code === "1-1200");
  const kas = cash.find((r) => r.code === "1-1100")?.cents ?? 0;
  const bank = cash.find((r) => r.code === "1-1200")?.cents ?? 0;
  const ar = all.find((r) => r.code === "1-1300")?.cents ?? 0;
  const ap = all.find((r) => r.code === "2-1100")?.cents ?? 0;

  const tiles: [string, number, boolean?][] = [
    ["Saldo kas", kas], ["Saldo bank", bank],
    ["Pendapatan bulan ini", revenue], ["Beban bulan ini", expenses],
    ["Laba kotor", gross, true], ["Laba bersih", net, true],
    ["Piutang", ar], ["Utang", ap],
    ["Total aset", sumBy(all, "asset")], ["Total kewajiban", sumBy(all, "liability")],
  ];

  return (
    <>
      <h1>Dashboard</h1>
      <p style={{ color: "var(--secondary)" }}>Periode {from} s.d. {to} · dihitung dari jurnal yang sudah diposting.</p>
      <div className="cards">
        {tiles.map(([label, v, signed]) => (
          <div className="card" key={label}>
            <small>{label}</small>
            <strong className={signed ? (v >= 0 ? "pos" : "neg") : ""}>{idr(v)}</strong>
          </div>
        ))}
      </div>
      {sumBy(all, "asset") === 0 && <p>Belum ada transaksi. Mulai dari menu <a href="/journal"><u>Jurnal Akuntansi</u></a>.</p>}
    </>
  );
}
