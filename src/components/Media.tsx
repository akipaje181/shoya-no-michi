"use client";
// 写真・動画の共通部品：サムネ・再生・追加（複数可）・編集・「この日の写真と動画」
import { useRef, useState } from "react";
import Link from "next/link";
import { Field, Modal } from "./ui";
import { useMediaState } from "./Avatar";
import { deleteCloudPhoto } from "@/lib/sync";
import { useAppData, updateData } from "@/lib/store";
import { deleteBlob, putBlob, shrinkPhoto, validateFile } from "@/lib/media";
import { formatJa, nowISO, today, uid } from "@/lib/date";
import type { MediaAsset, MediaTag } from "@/lib/types";

export const MEDIA_TAGS: { v: MediaTag; label: string }[] = [
  { v: "practice", label: "練習" }, { v: "batting", label: "バッティング" }, { v: "fielding", label: "守備" }, { v: "running", label: "走塁" }, { v: "game", label: "試合" }, { v: "memory", label: "思い出" }, { v: "other", label: "その他" },
];
export const tagLabel = (t: MediaTag) => MEDIA_TAGS.find((x) => x.v === t)?.label || "その他";

export type Pending = { file: File; kind: "photo" | "video" };

/** ファイル選択 → 種類チェック。だめなものは alert して除く */
export function pickFiles(files: FileList | File[] | null | undefined): Pending[] {
  const out: Pending[] = [];
  const bad: string[] = [];
  for (const f of Array.from(files || [])) {
    const v = validateFile(f);
    if (v.ok) out.push({ file: f, kind: v.kind });
    else bad.push(`${f.name}：${v.reason}`);
  }
  if (bad.length) alert(bad.join("\n"));
  return out;
}

export function Tile({ m }: { m: MediaAsset }) {
  const { url, missing } = useMediaState(m.id);
  if (missing) return <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted text-center px-1"><span className="text-xl">📱</span>撮った端末にだけ<br />あります</div>;
  if (!url) return <div className="w-full h-full flex items-center justify-center text-2xl">{m.kind === "video" ? "🎬" : "🖼️"}</div>;
  return m.kind === "video" ? <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" /> : <img src={url} alt="" className="w-full h-full object-cover" />;
}

export function Player({ id, kind, controls = true }: { id: string; kind: "photo" | "video"; controls?: boolean }) {
  const { url, missing } = useMediaState(id);
  if (missing) return <div className="aspect-video rounded-xl bg-black/30 flex flex-col items-center justify-center text-muted text-sm text-center px-4"><span className="text-3xl mb-1">📱</span>{kind === "video" ? "動画は撮った端末にだけ保存されています" : "この写真はまだ届いていません"}</div>;
  if (!url) return <div className="aspect-video rounded-xl bg-black/30 flex items-center justify-center text-muted">読み込み中…</div>;
  return kind === "video" ? <video src={url} className="w-full rounded-xl bg-black" controls={controls} playsInline /> : <img src={url} alt="" className="w-full rounded-xl" />;
}

/** 1件を見る・メモや日付を直す・消す */
export function ViewModal({ m, onClose }: { m: MediaAsset | null; onClose: () => void }) {
  return m ? <ViewModalInner key={m.id} m={m} onClose={onClose} /> : null;
}
function ViewModalInner({ m, onClose }: { m: MediaAsset; onClose: () => void }) {
  const [comment, setComment] = useState(m.comment || "");
  const [tag, setTag] = useState<MediaTag>(m.tag);
  const [date, setDate] = useState(m.date);
  return (
    <Modal open onClose={onClose} title={m.kind === "video" ? "🎬 動画" : "📷 写真"} wide>
      <Player id={m.id} kind={m.kind} />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Field label="日付"><input className="input" type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <Field label="種類"><select className="input" value={tag} onChange={(e) => setTag(e.target.value as MediaTag)}>{MEDIA_TAGS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select></Field>
      </div>
      <Field label="メモ"><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="例：ティー打撃。ひじが下がらないように" /></Field>
      <div className="flex gap-2">
        <button className="btn btn-danger btn-sm" onClick={async () => { if (!confirm("この動画・写真を消しますか？（もどせません）")) return; await deleteBlob(m.id); deleteCloudPhoto(m.id); updateData((d) => ({ ...d, media: d.media.filter((x) => x.id !== m.id), goals: d.goals.map((g) => ({ ...g, mediaIds: g.mediaIds.filter((x) => x !== m.id) })), games: d.games.map((g) => ({ ...g, mediaIds: g.mediaIds.filter((x) => x !== m.id) })), profile: d.profile.photoId === m.id ? { ...d.profile, photoId: undefined, avatar: { ...d.profile.avatar, usePhoto: false } } : d.profile })); onClose(); }}>消す</button>
        <Link href={`/note/?date=${date}`} className="btn btn-ghost btn-sm">📓 この日のノート</Link>
        <button className="btn btn-primary flex-1" onClick={() => { updateData((d) => ({ ...d, media: d.media.map((x) => (x.id === m.id ? { ...x, comment: comment.trim(), tag, date } : x)) })); onClose(); }}>保存</button>
      </div>
    </Modal>
  );
}

/** 追加（複数ファイルまとめて。日付・種類・メモは全部に同じものが付く。あとで1件ずつ直せる） */
export function AddModal({ pending, onClose, fixedDate, defaultTag = "practice" }: { pending: Pending[]; onClose: () => void; fixedDate?: string; defaultTag?: MediaTag }) {
  return pending.length ? <AddModalInner key={pending.map((p) => p.file.name).join("|")} pending={pending} onClose={onClose} fixedDate={fixedDate} defaultTag={defaultTag} /> : null;
}
function AddModalInner({ pending, onClose, fixedDate, defaultTag }: { pending: Pending[]; onClose: () => void; fixedDate?: string; defaultTag: MediaTag }) {
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState<MediaTag>(defaultTag);
  const [date, setDate] = useState(fixedDate || today());
  const [busy, setBusy] = useState<string | null>(null);
  const total = pending.reduce((s, p) => s + p.file.size, 0);
  const save = async () => {
    let done = 0;
    try {
      for (const p of pending) {
        done += 1;
        setBusy(`保存中… ${done}/${pending.length}`);
        const blob = p.kind === "photo" ? await shrinkPhoto(p.file) : p.file;
        const id = uid("md");
        await putBlob(id, blob);
        updateData((d) => ({ ...d, media: [...d.media, { id, kind: p.kind, mime: blob.type || p.file.type, size: blob.size, date, tag, comment: comment.trim(), createdAt: nowISO() }] }));
      }
      onClose();
    } catch (e) {
      alert(`保存できませんでした（${done - 1}/${pending.length} 件は保存ずみ）。容量がいっぱいかもしれません。`);
      console.error(e);
    } finally { setBusy(null); }
  };
  return (
    <Modal open onClose={onClose} title={pending.length === 1 ? (pending[0].kind === "video" ? "🎬 動画を追加" : "📷 写真を追加") : `📷🎬 ${pending.length} 件を追加`}>
      <div className="text-xs text-muted mb-3">{pending.length === 1 ? pending[0].file.name : `写真 ${pending.filter((p) => p.kind === "photo").length}・動画 ${pending.filter((p) => p.kind === "video").length}`}（{(total / 1024 / 1024).toFixed(1)} MB）</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="日付"><input className="input" type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <Field label="種類"><select className="input" value={tag} onChange={(e) => setTag(e.target.value as MediaTag)}>{MEDIA_TAGS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select></Field>
      </div>
      <Field label="メモ" hint={pending.length > 1 ? "全部に同じメモが付く。あとで1件ずつ直せる" : undefined}><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="例：ティー打撃。ひじが下がらないように" /></Field>
      <button className="btn btn-primary w-full" onClick={save} disabled={!!busy}>{busy || "保存"}</button>
    </Modal>
  );
}

/** その日の写真・動画（野球ノートに置く）。追加・メモ・消す */
export function DayMedia({ date }: { date: string }) {
  const data = useAppData();
  const [sel, setSel] = useState<MediaAsset | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const list = data.media.filter((m) => m.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-bold text-muted">📷🎬 この日の写真・動画 {list.length > 0 && <span className="chip !text-[10px]">{list.length}</span>}</div>
        <button type="button" className="btn btn-blue btn-sm !min-h-8" onClick={() => fileRef.current?.click()}>＋ 追加</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { setPending(pickFiles(e.target.files)); e.target.value = ""; }} />
      {list.length === 0 ? (
        <button type="button" className="w-full rounded-xl border border-dashed border-white/25 py-4 text-center text-xs text-muted tap" onClick={() => fileRef.current?.click()}>練習の写真や動画を入れる（複数まとめてOK）</button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {list.map((m) => (
            <button type="button" key={m.id} className="flex items-center gap-2 rounded-xl bg-black/20 p-1.5 text-left tap" onClick={() => setSel(m)}>
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/30 shrink-0"><Tile m={m} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-muted">{m.kind === "video" ? "▶ 動画" : "📷 写真"}・{tagLabel(m.tag)}</div>
                <div className={`text-sm line-clamp-2 ${m.comment ? "" : "text-muted"}`}>{m.comment || "メモなし（タップして書く）"}</div>
              </div>
              <span className="text-muted pr-1">›</span>
            </button>
          ))}
        </div>
      )}
      <ViewModal m={sel} onClose={() => setSel(null)} />
      <AddModal pending={pending} onClose={() => setPending([])} fixedDate={date} />
    </div>
  );
}

/** 日付ごとの一覧（アルバム用） */
export function groupByDate(list: MediaAsset[]): { date: string; items: MediaAsset[] }[] {
  const map = new Map<string, MediaAsset[]>();
  for (const m of list) { const a = map.get(m.date) || []; a.push(m); map.set(m.date, a); }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => ({ date, items: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }));
}

export function dateLabel(date: string): string { return formatJa(date, true); }
