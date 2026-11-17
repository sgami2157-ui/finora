"use client";

/** Input rupiah: tampil "1.500.000", nilai yang disimpan hanya digit ("1500000"). */
export function MoneyInput({
  value, onChange, placeholder = "0", required, id, autoFocus,
}: {
  value: string; onChange: (digits: string) => void; placeholder?: string; required?: boolean; id?: string; autoFocus?: boolean;
}) {
  const shown = value ? Number(value).toLocaleString("id-ID") : "";
  return (
    <div className="money">
      <span aria-hidden="true">Rp</span>
      <input
        id={id} inputMode="numeric" autoComplete="off" placeholder={placeholder} required={required} autoFocus={autoFocus}
        value={shown}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15))}
      />
    </div>
  );
}
