import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import { formatIDR, toCents } from "@/lib/accounting/money";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
type Hit = { title: string; sub?: string; href: string };
const LIMIT = 5;

// Pencarian global. Semua pembacaan lewat sesi pengguna (RLS) dan dibatasi ke bisnis pengguna.
export async function GET(req: NextRequest) {
  // Buang karakter yang bermakna di filter PostgREST/LIKE agar input tidak mengubah kueri.
  const q = (req.nextUrl.searchParams.get("q") ?? "").replace(/[,()*%_\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ groups: [] });
  const biz = await getBusiness();
  if (!biz) return NextResponse.json({ groups: [] });
  const sb = await supabaseServer();
  const p = `%${q}%`;
  const [inv, cus, sup, prod, acc, jr, doc] = await Promise.all([
    sb.from("invoices").select("id,type,number,issue_date,total").eq("business_id", biz.id).is("deleted_at", null).or(`number.ilike.${p},notes.ilike.${p}`).order("issue_date", { ascending: false }).limit(LIMIT),
    sb.from("customers").select("name,phone,email").eq("business_id", biz.id).is("deleted_at", null).or(`name.ilike.${p},phone.ilike.${p},email.ilike.${p}`).limit(LIMIT),
    sb.from("suppliers").select("name,phone,email").eq("business_id", biz.id).is("deleted_at", null).or(`name.ilike.${p},phone.ilike.${p},email.ilike.${p}`).limit(LIMIT),
    sb.from("products").select("name,sku,stock_qty").eq("business_id", biz.id).is("deleted_at", null).or(`name.ilike.${p},sku.ilike.${p}`).limit(LIMIT),
    sb.from("accounts").select("id,code,name").eq("business_id", biz.id).or(`name.ilike.${p},code.ilike.${p}`).order("code").limit(LIMIT),
    sb.from("journal_entries").select("number,entry_date,description").eq("business_id", biz.id).or(`number.ilike.${p},description.ilike.${p}`).order("entry_date", { ascending: false }).limit(LIMIT),
    sb.from("attachments").select("file_name,created_at").eq("business_id", biz.id).is("deleted_at", null).ilike("file_name", p).limit(LIMIT),
  ]);
  const groups: { label: string; items: Hit[] }[] = [];
  const add = (label: string, items: Hit[]) => { if (items.length) groups.push({ label, items }); };
  add("Faktur", (inv.data ?? []).map((i) => ({ title: i.number, sub: `${i.type === "sale" ? "Penjualan" : "Pembelian"} · ${fmtDate(i.issue_date)} · ${formatIDR(toCents(Number(i.total)))}`, href: `/invoices/${i.id}` })));
  add("Pelanggan", (cus.data ?? []).map((c) => ({ title: c.name, sub: [c.phone, c.email].filter(Boolean).join(" · ") || undefined, href: "/parties" })));
  add("Pemasok", (sup.data ?? []).map((c) => ({ title: c.name, sub: [c.phone, c.email].filter(Boolean).join(" · ") || undefined, href: "/parties" })));
  add("Produk", (prod.data ?? []).map((x) => ({ title: x.name, sub: `${x.sku ? x.sku + " · " : ""}stok ${Number(x.stock_qty)}`, href: "/products" })));
  add("Akun", (acc.data ?? []).map((a) => ({ title: `${a.code} · ${a.name}`, sub: "Buka buku besar", href: `/ledger?account=${a.id}` })));
  add("Jurnal", (jr.data ?? []).map((j) => ({ title: j.number, sub: `${fmtDate(j.entry_date)} · ${j.description}`, href: "/journal" })));
  add("Dokumen", (doc.data ?? []).map((d) => ({ title: d.file_name, sub: fmtDate(d.created_at), href: "/documents" })));
  return NextResponse.json({ groups }, { headers: { "cache-control": "no-store" } });
}
