"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { todayJakarta } from "@/lib/format";

type Msg = { role: "user" | "assistant"; content: string };
type Status = "checking" | "ready" | "off" | "unavailable";

const SUGGEST = [
  "Bagaimana kondisi keuangan usaha saya bulan ini?",
  "Biaya apa yang paling besar dan bisa dihemat?",
  "Apakah uang kas saya aman untuk bulan depan?",
  "Apa yang harus saya lakukan dengan piutang?",
];

function monthStart(): string { return todayJakarta().slice(0, 8) + "01"; }

export default function AiChat({ businessId, initial }: { businessId: string; initial: Msg[] }) {
  const [status, setStatus] = useState<Status>("checking");
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [q, setQ] = useState(""); const [range, setRange] = useState<"month" | "all">("month");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    supabaseBrowser().functions.invoke("ai-analyst", { body: { business_id: businessId, ping: true } })
      .then(({ data, error: err }: { data: { configured?: boolean } | null; error: unknown }) => {
        if (!alive) return;
        if (err) setStatus("unavailable"); else setStatus(data?.configured ? "ready" : "off");
      });
    return () => { alive = false; };
  }, [businessId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, busy]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setError(null); setBusy(true); setMsgs((m) => [...m, { role: "user", content: question }]); setQ("");
    const { data, error: err } = await supabaseBrowser().functions.invoke("ai-analyst", {
      body: { business_id: businessId, question, from: range === "month" ? monthStart() : null, to: todayJakarta() },
    });
    setBusy(false);
    if (err) {
      let msg = friendlyError((err as { message?: string }).message);
      try { const j = await (err as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.(); if (j?.error) msg = j.error; } catch { /* abaikan */ }
      return setError(msg);
    }
    const answer = (data as { answer?: string } | null)?.answer;
    setMsgs((m) => [...m, { role: "assistant", content: answer || "Maaf, tidak ada jawaban." }]);
  }

  if (status === "checking") return <p className="muted sm">Memeriksa layanan AI…</p>;
  if (status !== "ready") {
    return (
      <div className="callout warn" role="status">
        <strong>{status === "off" ? "Fitur AI belum diaktifkan" : "Layanan AI belum tersedia"}</strong>
        <div>
          {status === "off"
            ? "Fungsi AI sudah terpasang, tetapi kunci layanan AI belum diisi oleh pemilik aplikasi (ANTHROPIC_API_KEY dan ANTHROPIC_MODEL di Supabase). Sementara itu, “Wawasan otomatis” di atas tetap bekerja."
            : "Fungsi AI belum bisa dihubungi. Wawasan otomatis di atas tetap bekerja."}
        </div>
      </div>
    );
  }
  return (
    <div className="chat">
      <div className="chat-log" aria-live="polite">
        {msgs.length === 0 && (
          <div className="chat-empty">
            <p className="muted sm">Tanya apa saja tentang keuangan usaha Anda. Pilih salah satu contoh:</p>
            <div className="chips">{SUGGEST.map((s) => <button key={s} type="button" className="chip-btn" onClick={() => ask(s)}>{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.content}</div>)}
        {busy && <div className="bubble assistant typing" aria-label="AI sedang menjawab">…</div>}
        <div ref={end} />
      </div>
      {error && <div className="alert err" role="alert">{error}</div>}
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <div className="seg" role="radiogroup" aria-label="Periode data">
          <button type="button" role="radio" aria-checked={range === "month"} className={range === "month" ? "on" : ""} onClick={() => setRange("month")}>Bulan ini</button>
          <button type="button" role="radio" aria-checked={range === "all"} className={range === "all" ? "on" : ""} onClick={() => setRange("all")}>Sejak awal</button>
        </div>
        <div className="chat-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tulis pertanyaan Anda…" maxLength={2000} aria-label="Pertanyaan" />
          <button className="primary" aria-busy={busy} disabled={busy || !q.trim()}>Kirim</button>
        </div>
      </form>
      <small className="hint">Jawaban AI dibuat dari angka di aplikasi ini dan bisa keliru. Periksa kembali sebelum mengambil keputusan penting.</small>
    </div>
  );
}
