"use client";
import { useRef, useState } from "react";
import { Card, Empty, Field, Modal, PageHeader } from "@/components/ui";
import { useMediaUrl } from "@/components/Avatar";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { deleteBlob, putBlob, shrinkPhoto, validateFile } from "@/lib/media";
import { IMG } from "@/lib/img";
import { formatJa, nowISO, today, uid } from "@/lib/date";
import type { MediaAsset, MediaTag } from "@/lib/types";

const TAGS: { v: MediaTag | "all"; label: string }[] = [
  { v: "all", label: "すべて" }, { v: "batting", label: "バッティング" }, { v: "fielding", label: "守備" }, { v: "running", label: "走塁" }, { v: "game", label: "試合" }, { v: "memory", label: "思い出" }, { v: "other", label: "その他" },
];

export default function AlbumPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [tag, setTag] = useState<MediaTag | "all">("all");
  const [sel, setSel] = useState<MediaAsset | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [adding, setAdding] = useState<{ file: File; kind: "photo" | "video" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  const list = [...data.media].filter((m) => tag === "all" || m.tag === tag).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const onPick = (f: File) => {
    const v = validateFile(f);
    if (!v.ok) { alert(v.reason); return; }
    setAdding({ file: f, kind: v.kind });
  };
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id]));

  return (
    <div>
      <PageHeader title="動画アルバム" sub={`${data.media.length} 件`} banner={IMG.banner("album")} right={<button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>＋ 追加</button>} />
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      <div className="px-4">
        <div className="scroll-x flex gap-2 pb-1">
          {TAGS.map((t) => <button key={t.v} className={`chip !px-3 !py-2 !text-sm shrink-0 ${tag === t.v ? "chip-lime" : ""}`} onClick={() => setTag(t.v)}>{t.label}</button>)}
        </div>
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="text-xs text-muted">{compareMode ? "くらべる2つを選ぶ" : "タップで再生・編集"}</div>
          <button className={`btn btn-sm ${compareMode ? "btn-blue" : "btn-ghost"}`} onClick={() => { setCompareMode((v) => !v); setCompare([]); }}>🔁 2つをくらべる</button>
        </div>
        {compareMode && compare.length === 2 && <CompareView ids={compare} onClose={() => { setCompareMode(false); setCompare([]); }} />}
        {list.length === 0 ? (
          <Card className="mt-3"><Empty text="まだ動画・写真がありません" sub="「＋ 追加」でバッティング動画や思い出の写真を入れよう" /></Card>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {list.map((m) => (
              <button key={m.id} className={`relative aspect-square rounded-xl overflow-hidden bg-black/30 ${compare.includes(m.id) ? "ring-3 ring-lime" : ""}`} onClick={() => (compareMode ? toggleCompare(m.id) : setSel(m))}>
                <Tile m={m} />
                <span className="absolute bottom-1 left-1 chip !text-[10px] !py-0.5 !px-1.5 bg-black/60">{m.kind === "video" ? "▶" : "📷"} {TAGS.find((t) => t.v === m.tag)?.label}</span>
                {compare.includes(m.id) && <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-lime text-navy font-display flex items-center justify-center">{compare.indexOf(m.id) + 1}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <ViewModal m={sel} onClose={() => setSel(null)} />
      <AddModal pending={adding} onClose={() => setAdding(null)} />
    </div>
  );
}

function Tile({ m }: { m: MediaAsset }) {
  const url = useMediaUrl(m.id);
  if (!url) return <div className="w-full h-full flex items-center justify-center text-2xl">{m.kind === "video" ? "🎬" : "🖼️"}</div>;
  return m.kind === "video" ? <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" /> : <img src={url} alt="" className="w-full h-full object-cover" />;
}

function Player({ id, kind, controls = true }: { id: string; kind: "photo" | "video"; controls?: boolean }) {
  const url = useMediaUrl(id);
  if (!url) return <div className="aspect-video rounded-xl bg-black/30 flex items-center justify-center text-muted">読み込み中…</div>;
  return kind === "video" ? <video src={url} className="w-full rounded-xl bg-black" controls={controls} playsInline /> : <img src={url} alt="" className="w-full rounded-xl" />;
}

function CompareView({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const data = useAppData();
  const ms = ids.map((id) => data.media.find((m) => m.id === id)).filter((m): m is MediaAsset => !!m);
  return (
    <Card className="mt-3">
      <div className="flex items-center justify-between mb-2"><div className="font-display">🔁 くらべる</div><button className="btn btn-ghost btn-sm" onClick={onClose}>とじる</button></div>
      <div className="grid grid-cols-2 gap-2">
        {ms.map((m) => (
          <div key={m.id}>
            <Player id={m.id} kind={m.kind} />
            <div className="text-[11px] text-muted mt-1">{formatJa(m.date)} {m.comment}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-2">前の動画と今の動画を並べて、フォームの変化を見よう。</p>
    </Card>
  );
}

function ViewModal({ m, onClose }: { m: MediaAsset | null; onClose: () => void }) {
  const [k, setK] = useState("");
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState<MediaTag>("other");
  const [date, setDate] = useState(today());
  if (m && k !== m.id) { setK(m.id); setComment(m.comment || ""); setTag(m.tag); setDate(m.date); }
  if (!m) return null;
  return (
    <Modal open={!!m} onClose={onClose} title={m.kind === "video" ? "🎬 動画" : "📷 写真"} wide>
      <Player id={m.id} kind={m.kind} />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Field label="撮影日"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="種類"><select className="input" value={tag} onChange={(e) => setTag(e.target.value as MediaTag)}>{TAGS.filter((t) => t.v !== "all").map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select></Field>
      </div>
      <Field label="コメント"><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      <div className="flex gap-2">
        <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm("この動画・写真を消しますか？（もどせません）")) return; await deleteBlob(m.id); updateData((d) => ({ ...d, media: d.media.filter((x) => x.id !== m.id), goals: d.goals.map((g) => ({ ...g, mediaIds: g.mediaIds.filter((x) => x !== m.id) })), games: d.games.map((g) => ({ ...g, mediaIds: g.mediaIds.filter((x) => x !== m.id) })), profile: d.profile.photoId === m.id ? { ...d.profile, photoId: undefined, avatar: { ...d.profile.avatar, usePhoto: false } } : d.profile })); onClose(); }}>消す</button>
        <button className="btn btn-primary flex-1" onClick={() => { updateData((d) => ({ ...d, media: d.media.map((x) => (x.id === m.id ? { ...x, comment: comment.trim(), tag, date } : x)) })); onClose(); }}>保存</button>
      </div>
    </Modal>
  );
}

function AddModal({ pending, onClose }: { pending: { file: File; kind: "photo" | "video" } | null; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState<MediaTag>("batting");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  if (!pending) return null;
  const save = async () => {
    setBusy(true);
    try {
      const blob = pending.kind === "photo" ? await shrinkPhoto(pending.file) : pending.file;
      const id = uid("md");
      await putBlob(id, blob);
      updateData((d) => ({ ...d, media: [...d.media, { id, kind: pending.kind, mime: blob.type || pending.file.type, size: blob.size, date, tag, comment: comment.trim(), createdAt: nowISO() }] }));
      setComment(""); onClose();
    } catch (e) {
      alert("保存できませんでした。容量がいっぱいかもしれません。");
      console.error(e);
    } finally { setBusy(false); }
  };
  return (
    <Modal open={!!pending} onClose={onClose} title={pending.kind === "video" ? "🎬 動画を追加" : "📷 写真を追加"}>
      <div className="text-xs text-muted mb-3">{pending.file.name}（{(pending.file.size / 1024 / 1024).toFixed(1)} MB）</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="撮影日"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="種類"><select className="input" value={tag} onChange={(e) => setTag(e.target.value as MediaTag)}>{TAGS.filter((t) => t.v !== "all").map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select></Field>
      </div>
      <Field label="コメント"><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="例：ティー打撃。ひじが下がらないように" /></Field>
      <button className="btn btn-primary w-full" onClick={save} disabled={busy}>{busy ? "保存中…" : "保存"}</button>
    </Modal>
  );
}
