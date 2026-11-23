/** Notifikasi singkat. Dipanggil dari komponen klien mana pun; ditampilkan oleh <Toaster />. */
export type ToastKind = "ok" | "err";
export function toast(message: string, kind: ToastKind = "ok") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("finora:toast", { detail: { message, kind } }));
}
