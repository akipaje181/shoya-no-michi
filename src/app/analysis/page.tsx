"use client";
// 分析：投球・打撃・守備・走塁・盗塁ごとに、分析した資料（PDF・スライド・写真・動画）をためておく
import { useEffect, useRef, useState } from "react";
import { Card, Empty, Field, Ic, Modal, PageHeader } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { deleteBlob, getBlob, putBlob } from "@/lib/media";
import { formatJa, nowISO, today, uid } from "@/lib/date";
import type { AnalysisCategory, AnalysisDoc, AnalysisFile, AnalysisFileKind } from "@/lib/types";

const ANALYSIS_CATS: { v: AnalysisCategory; label: string; emoji: string; icon: string }[] = [
  { v: "pitching", label: "投球", emoji: "⚾", icon: "cat-pitching" },
  { v: "batting", label: "打撃", emoji: "🏏", icon: "cat-batting" },
  { v: "fielding", label: "守備", emoji: "🧤", icon: "cat-fielding" },
  { v: "running", label: "走塁", emoji: "🏃", icon: "cat-running" },
  { v: "stealing", label: "盗塁", emoji: "💨", icon: "" },
];
const catOf = (c: AnalysisCategory) => ANALYSIS_CATS.find((x) => x.v === c) || ANALYSIS_CATS[1];

const MAX_FILE = 200 * 1024 * 1024; // 200MB
const ACCEPT = "application/pdf,image/*,video/*,.pdf,.key,.pptx,.ppt,.docx,.doc,.xlsx,.numbers,.pages,.txt,.md";

function kindOf(f: File): AnalysisFileKind {
  const t = f.type.toLowerCase();
  const n = f.name.toLowerCase();
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (t.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|gif)$/.test(n)) return "photo";
  if (t.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/.test(n)) return "video";
  if (/\.(key|pptx?|odp)$/.test(n) || t.includes("presentation")) return "slides";
  return "other";
}
const KIND_LABEL: Record<AnalysisFileKind, string> = { pdf: "📄 PDF", photo: "📷 写真", video: "🎬 動画", slides: "🖥️ スライド", other: "📎 ファイル" };
function sizeLabel(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(n / 1024))}KB`;
}

async function saveFiles(files: File[]): Promise<{ saved: AnalysisFile[]; errors: string[] }> {
  const saved: AnalysisFile[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE) { errors.push(`${f.name}：大きすぎます（200MBまで）`); continue; }
    const id = uid("af_");
    try {
      await putBlob(id, f);
      saved.push({ id, name: f.name, mime: f.type || "application/octet-stream", size: f.size, kind: kindOf(f), addedAt: nowISO() });
    } catch {
      errors.push(`${f.name}：保存できませんでした（端末の空き容量を確認してください）`);
    }
  }
  return { saved, errors };
}

export default function AnalysisPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [cat, setCat] = useState<AnalysisCategory>(() => {
    if (typeof window === "undefined") return "batting";
    const c = new URLSearchParams(window.location.search).get("cat") as AnalysisCategory | null;
    return c && ANALYSIS_CATS.some((x) => x.v === c) ? c : "batting";
  });
  const [editing, setEditing] = useState<AnalysisDoc | "new" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  const all = data.analyses || [];
  const list = all.filter((d) => d.category === cat).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const opened = all.find((d) => d.id === openId) || null;
  const c = catOf(cat);

  return (
    <div>
      <PageHeader title="分析" sub={`${all.length} 件の資料`} right={<button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>＋ 資料</button>} />
      <div className="px-4">
        <div className="grid grid-cols-5 gap-1.5">
          {ANALYSIS_CATS.map((x) => {
            const n = all.filter((d) => d.category === x.v).length;
            return (
              <button key={x.v} onClick={() => setCat(x.v)} className={`rounded-xl py-2 flex flex-col items-center gap-0.5 transition ${cat === x.v ? "bg-blue text-white shadow" : "bg-black/25 text-muted"}`}>
                <Ic name={x.icon || undefined} emoji={x.emoji} size={30} />
                <span className="text-sm font-bold">{x.label}</span>
                <span className="text-[10px] opacity-80">{n} 件</span>
              </button>
            );
          })}
        </div>

        {list.length === 0 ? (
          <Card className="mt-3">
            <Empty text={`${c.label}の資料はまだありません`} sub="「＋ 資料」で、分析した PDF・スライド・写真・動画を入れよう" />
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5 mt-3">
            {list.map((d) => (
              <Card key={d.id} className="!p-3" onClick={() => setOpenId(d.id)}>
                <div className="flex items-start gap-3">
                  <Ic name={c.icon || undefined} emoji={c.emoji} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted">{formatJa(d.date, true)}</div>
                    <div className="font-display leading-snug">{d.title}</div>
                    {d.memo && <div className="text-xs text-white/80 mt-0.5 line-clamp-2">{d.memo}</div>}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.files.length === 0 ? <span className="chip !text-[10px]">ファイルなし</span> : d.files.map((f) => <span key={f.id} className="chip !text-[10px]">{KIND_LABEL[f.kind]}</span>)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted mt-3 px-1">ファイルはこの端末の中に保存される（1つ200MBまで）。「端末どうしの同期」をオンにしていると、題名・日付・メモはもう一方の端末にも届くが、ファイルそのものは入れた端末だけ。</p>
      </div>

      {editing && <EditModal doc={editing === "new" ? null : editing} defaultCat={cat} onClose={() => setEditing(null)} onSaved={(d) => { setCat(d.category); setEditing(null); setOpenId(d.id); }} />}
      {opened && !editing && <DocModal doc={opened} onClose={() => setOpenId(null)} onEdit={() => setEditing(opened)} />}
    </div>
  );
}

function EditModal({ doc, defaultCat, onClose, onSaved }: { doc: AnalysisDoc | null; defaultCat: AnalysisCategory; onClose: () => void; onSaved: (d: AnalysisDoc) => void }) {
  const [category, setCategory] = useState<AnalysisCategory>(doc?.category || defaultCat);
  const [date, setDate] = useState(doc?.date || today());
  const [title, setTitle] = useState(doc?.title || "");
  const [memo, setMemo] = useState(doc?.memo || "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!title.trim()) { setErrors(["題名を入れてください"]); return; }
    setBusy(true);
    const { saved, errors } = await saveFiles(files);
    const now = nowISO();
    const d: AnalysisDoc = doc
      ? { ...doc, category, date, title: title.trim(), memo: memo.trim() || undefined, files: [...doc.files, ...saved], updatedAt: now }
      : { id: uid("an_"), category, date, title: title.trim(), memo: memo.trim() || undefined, files: saved, createdAt: now, updatedAt: now };
    updateData((x) => ({ ...x, analyses: doc ? (x.analyses || []).map((a) => (a.id === d.id ? d : a)) : [d, ...(x.analyses || [])] }));
    setBusy(false);
    if (errors.length) { setErrors(errors); setFiles([]); return; }
    onSaved(d);
  };

  return (
    <Modal open onClose={onClose} title={doc ? "資料を直す" : "分析の資料を追加"}>
      <div className="flex flex-col gap-3">
        <Field label="項目">
          <div className="grid grid-cols-5 gap-1">
            {ANALYSIS_CATS.map((x) => (
              <button key={x.v} type="button" onClick={() => setCategory(x.v)} className={`rounded-lg py-2 text-sm font-bold ${category === x.v ? "bg-blue text-white" : "bg-black/25 text-muted"}`}>{x.label}</button>
            ))}
          </div>
        </Field>
        <Field label="日付"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value || today())} /></Field>
        <Field label="題名"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：バッティング分析（11月の打席）" /></Field>
        <Field label="メモ" hint="わかったこと・次にやることなど"><textarea className="input min-h-20" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例：ためを作る。左ひざはホームベースを見る" /></Field>
        <Field label="ファイル" hint="PDF・Keynote・PowerPoint・写真・動画など。複数まとめてOK">
          <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => { const picked = Array.from(e.target.files || []); setFiles((f) => [...f, ...picked]); e.target.value = ""; }} />
          <button type="button" className="btn btn-ghost w-full" onClick={() => fileRef.current?.click()}>📎 ファイルを選ぶ</button>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-xs bg-black/25 rounded-lg px-2 py-1.5">
                  <span className="truncate">{KIND_LABEL[kindOf(f)]}　{f.name}（{sizeLabel(f.size)}）</span>
                  <button type="button" className="text-muted px-1" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label="外す">✕</button>
                </li>
              ))}
            </ul>
          )}
          {doc && doc.files.length > 0 && <div className="text-[11px] text-muted mt-1">いま入っているファイル {doc.files.length} 件はそのまま残ります</div>}
        </Field>
        {errors.length > 0 && <ul className="text-xs text-red-300 space-y-0.5">{errors.map((e, i) => <li key={i}>⚠️ {e}</li>)}</ul>}
        <button className="btn btn-primary w-full" disabled={busy} onClick={save}>{busy ? "保存中…" : "保存する"}</button>
      </div>
    </Modal>
  );
}

function DocModal({ doc, onClose, onEdit }: { doc: AnalysisDoc; onClose: () => void; onEdit: () => void }) {
  const c = catOf(doc.category);
  const removeDoc = async () => {
    if (!confirm(`「${doc.title}」を消しますか？（ファイルも消えます）`)) return;
    for (const f of doc.files) await deleteBlob(f.id).catch(() => {});
    updateData((x) => ({ ...x, analyses: (x.analyses || []).filter((a) => a.id !== doc.id) }));
    onClose();
  };
  const removeFile = async (f: AnalysisFile) => {
    if (!confirm(`「${f.name}」を消しますか？`)) return;
    await deleteBlob(f.id).catch(() => {});
    updateData((x) => ({
      ...x,
      tombstones: [...(x.tombstones || []), `analysisFile:${f.id}`],
      analyses: (x.analyses || []).map((a) => (a.id === doc.id ? { ...a, files: a.files.filter((y) => y.id !== f.id), updatedAt: nowISO() } : a)),
    }));
  };
  return (
    <Modal open onClose={onClose} title={`${c.label}の分析`} wide>
      <div className="text-xs text-muted">{formatJa(doc.date, true)}</div>
      <div className="font-display text-lg leading-snug">{doc.title}</div>
      {doc.memo && <p className="text-sm text-white/85 whitespace-pre-wrap mt-1">{doc.memo}</p>}
      <div className="flex flex-col gap-3 mt-3">
        {doc.files.length === 0 && <div className="text-sm text-muted">ファイルはまだありません。「✏️ 直す」から追加できます。</div>}
        {doc.files.map((f) => <FileItem key={f.id} f={f} onRemove={() => removeFile(f)} />)}
      </div>
      <div className="flex gap-2 mt-4">
        <button className="btn btn-blue flex-1" onClick={onEdit}>✏️ 直す・ファイル追加</button>
        <button className="btn btn-ghost" onClick={removeDoc}>🗑️ 消す</button>
      </div>
    </Modal>
  );
}

function FileItem({ f, onRemove }: { f: AnalysisFile; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    let alive = true;
    getBlob(f.id).then((b) => {
      if (!alive) return;
      if (!b) { setMissing(true); return; }
      u = URL.createObjectURL(b);
      setBlob(b);
      setUrl(u);
    }).catch(() => alive && setMissing(true));
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [f.id]);

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], f.name, { type: f.mime });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: f.name }); } catch { /* 閉じただけ */ }
    } else if (url) {
      const a = document.createElement("a");
      a.href = url; a.download = f.name; a.click();
    }
  };

  return (
    <div className="rounded-xl bg-black/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted">{KIND_LABEL[f.kind]}・{sizeLabel(f.size)}</div>
          <div className="text-sm font-bold truncate">{f.name}</div>
        </div>
        <button className="text-muted text-sm px-1 shrink-0" onClick={onRemove} aria-label="このファイルを消す">🗑️</button>
      </div>
      {missing ? (
        <div className="text-xs text-muted mt-2">このファイルは入れた端末にだけあります。</div>
      ) : !url ? (
        <div className="text-xs text-muted mt-2">読み込み中…</div>
      ) : (
        <>
          {f.kind === "photo" && <img src={url} alt={f.name} className="mt-2 w-full rounded-lg" />}
          {f.kind === "video" && <video src={url} controls playsInline className="mt-2 w-full rounded-lg bg-black" />}
          <div className="flex gap-2 mt-2">
            {(f.kind === "pdf" || f.kind === "photo" || f.kind === "video") && <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm flex-1">🔍 ひらく</a>}
            <button className="btn btn-ghost btn-sm flex-1" onClick={share}>📤 {f.kind === "slides" ? "Keynote などで開く・保存" : "共有・保存"}</button>
          </div>
        </>
      )}
    </div>
  );
}
