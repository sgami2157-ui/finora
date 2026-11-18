/** Loader bermerek FINORA: huruf F berdenyut dengan cincin berputar + teks FINORA bergelombang. Murni markup/CSS. */
export default function BrandLoader({ label = "Memuat…", size = "md" }: { label?: string; size?: "sm" | "md" }) {
  return (
    <div className={`brand-loader ${size}`} role="status" aria-live="polite">
      <span className="bl-mark" aria-hidden="true"><b>F</b></span>
      <span className="bl-word" aria-hidden="true">
        {"FINORA".split("").map((c, i) => <i key={i} style={{ animationDelay: `${i * 0.09}s` }}>{c}</i>)}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
