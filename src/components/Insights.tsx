import type { Insight } from "@/lib/insights";
import { Icon, type IconName } from "./Icon";

const ICON: Record<Insight["tone"], IconName> = { pos: "check", neg: "alert", warn: "alert", info: "sparkles" };

export function Insights({ items, limit }: { items: Insight[]; limit?: number }) {
  const list = limit ? items.slice(0, limit) : items;
  if (list.length === 0) {
    return <p className="muted sm">Belum ada hal yang perlu diperhatikan. Terus catat transaksi Anda, wawasan akan muncul di sini.</p>;
  }
  return (
    <ul className="insights">
      {list.map((i, k) => (
        <li key={k} className={`insight ${i.tone}`}>
          <span className="insight-ico"><Icon name={ICON[i.tone]} size={18} /></span>
          <div>
            <strong>{i.title}</strong>
            <p>{i.text}</p>
            {i.href && <a href={i.href}>Buka →</a>}
          </div>
        </li>
      ))}
    </ul>
  );
}
