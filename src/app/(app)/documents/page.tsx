import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { DocRowActions, UploadForm } from "@/components/DocumentForms";
import { DOC_CATEGORIES } from "@/lib/doc-categories";
import { Badge, Callout, Empty, PageHead, Panel } from "@/components/ui";

type D = { id: string; category: string; file_name: string; mime_type: string; size_bytes: number | string; storage_path: string | null; created_at: string };
const label = new Map(DOC_CATEGORIES);
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default async function DocumentsPage() {
  const biz = await getBusiness();
  if (!biz) return (<><PageHead title="Dokumen" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);
  const sb = await supabaseServer();
  const { data } = await sb.from("attachments").select("id,category,file_name,mime_type,size_bytes,storage_path,created_at").eq("business_id", biz.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(100);
  const docs = (data ?? []) as D[];
  return (
    <>
      <PageHead title="Dokumen" desc="Simpan foto struk, nota, bukti transfer, dan berkas penting usaha di satu tempat yang aman." />
      <Callout title="Tips">Foto struk langsung dari HP lalu unggah di sini. Dengan begitu bukti transaksi tidak hilang saat dibutuhkan untuk pemeriksaan atau pajak.</Callout>
      <div className="split">
        <Panel title="Unggah dokumen"><UploadForm businessId={biz.id} /></Panel>
        <Panel title="Dokumen tersimpan" desc={`${docs.length} berkas`}>
          {docs.length === 0 ? <Empty icon="folder" title="Belum ada dokumen" desc="Unggah struk atau nota pertama Anda lewat formulir." /> : (
            <ul className="rows">
              {docs.map((d) => (
                <li key={d.id} className="row-card">
                  <div className="row-main">
                    <div><strong>{d.file_name}</strong><small className="sub">{fmtDate(d.created_at)} · {size(Number(d.size_bytes))}</small></div>
                    <Badge tone="pri">{label.get(d.category) ?? d.category}</Badge>
                  </div>
                  <div className="row-foot"><span /><DocRowActions id={d.id} path={d.storage_path} name={d.file_name} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
