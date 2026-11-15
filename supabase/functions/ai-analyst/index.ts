// Supabase Edge Function (Deno). BELUM DIUJI terhadap project Supabase / API model sungguhan.
// Secret yang dibutuhkan: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (set via `supabase secrets set`).
// Data dibaca dengan JWT pengguna sehingga RLS membatasi ke bisnis milik pengguna itu saja.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM_PROMPT = `Anda adalah analis keuangan untuk UMKM Indonesia.
Aturan: gunakan HANYA angka pada DATA di bawah; jangan mengarang angka. Jika data tidak cukup, katakan keterbatasannya.
Selalu sebutkan periode dan dasar perhitungan. Anda tidak dapat mengubah atau menghapus transaksi.
Jawab dalam Bahasa Indonesia, ringkas, nominal dalam Rupiah.`;

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("authorization");
  if (!auth) return json({ error: "Tidak terautentikasi" }, 401);

  const { business_id, question, from, to } = await req.json().catch(() => ({}));
  if (!business_id || !question || typeof question !== "string" || question.length > 2000) return json({ error: "Input tidak valid" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Tidak terautentikasi" }, 401);

  const { data: bal, error } = await sb.rpc("account_balances", { p_business: business_id, p_from: from ?? null, p_to: to ?? null });
  if (error) return json({ error: "Tidak dapat membaca data bisnis" }, 403);
  const rows = (bal as { code: string; name: string; type: string; balance: number }[]).filter((r) => Number(r.balance) !== 0);

  const data = JSON.stringify({ periode: { dari: from ?? "awal", sampai: to ?? "sekarang" }, saldo_akun: rows });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL"), max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nDATA:\n${data}`,
      messages: [{ role: "user", content: question }],
    }),
  });
  if (!res.ok) return json({ error: `Layanan AI gagal (${res.status})` }, 502);
  const answer = ((await res.json()).content?.[0]?.text ?? "") as string;

  await sb.from("ai_conversations").insert([
    { business_id, user_id: user.id, role: "user", content: question, period_from: from ?? null, period_to: to ?? null },
    { business_id, user_id: user.id, role: "assistant", content: answer, period_from: from ?? null, period_to: to ?? null },
  ]);
  return json({ answer });
});
