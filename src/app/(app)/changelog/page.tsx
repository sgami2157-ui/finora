import { PageHead, Panel, Badge } from "@/components/ui";
import { APP_VERSION, RELEASES } from "@/lib/changelog";

export default function ChangelogPage() {
  return (
    <>
      <PageHead title="Yang Baru" desc={`Versi terpasang: ${APP_VERSION}`} />
      <div className="stack">
        {RELEASES.map((r) => (
          <Panel key={r.version} title={`Versi ${r.version} — ${r.title}`} desc={new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(r.date))} action={r.version === APP_VERSION ? <Badge tone="pos">Terpasang</Badge> : undefined}>
            {r.groups.map((g) => (
              <section key={g.label} className="rel-group">
                <h3>{g.label}</h3>
                <ul>{g.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </section>
            ))}
          </Panel>
        ))}
      </div>
    </>
  );
}
