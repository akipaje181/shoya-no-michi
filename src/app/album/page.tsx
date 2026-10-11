"use client";
// 動画アルバム：種類で絞る／日付ごとに見る／2つをくらべる。追加は複数まとめてOK
import { useRef, useState } from "react";
import Link from "next/link";
import { Card, Empty, PageHeader, Segmented } from "@/components/ui";
import { AddModal, MEDIA_TAGS, Player, Tile, ViewModal, groupByDate, pickFiles, tagLabel, type Pending } from "@/components/Media";
import { useAppData, useHydrated } from "@/lib/store";
import { IMG } from "@/lib/img";
import { formatJa } from "@/lib/date";
import type { MediaAsset, MediaTag } from "@/lib/types";

const TAGS: { v: MediaTag | "all"; label: string }[] = [{ v: "all", label: "すべて" }, ...MEDIA_TAGS];

export default function AlbumPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [tag, setTag] = useState<MediaTag | "all">("all");
  const [view, setView] = useState<"grid" | "date">("date");
  const [sel, setSel] = useState<MediaAsset | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  const list = [...data.media].filter((m) => tag === "all" || m.tag === tag).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const groups = groupByDate(list);
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id]));
  const open = (m: MediaAsset) => (compareMode ? toggleCompare(m.id) : setSel(m));

  const tile = (m: MediaAsset) => (
    <button key={m.id} className={`relative aspect-square rounded-xl overflow-hidden bg-black/30 ${compare.includes(m.id) ? "ring-3 ring-lime" : ""}`} onClick={() => open(m)}>
      <Tile m={m} />
      <span className="absolute bottom-1 left-1 chip !text-[10px] !py-0.5 !px-1.5 bg-black/60">{m.kind === "video" ? "▶" : "📷"} {tagLabel(m.tag)}</span>
      {m.comment && <span className="absolute top-1 left-1 text-[10px]">📝</span>}
      {compare.includes(m.id) && <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-lime text-navy font-display flex items-center justify-center">{compare.indexOf(m.id) + 1}</span>}
    </button>
  );

  return (
    <div>
      <PageHeader title="動画アルバム" sub={`${data.media.length} 件`} banner={IMG.banner("album")} right={<button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>＋ 追加</button>} />
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { setPending(pickFiles(e.target.files)); e.target.value = ""; }} />
      <div className="px-4">
        <Segmented value={view} options={[{ v: "date" as const, label: "📅 日付ごと" }, { v: "grid" as const, label: "🔲 いちらん" }]} onChange={setView} />
        <div className="scroll-x flex gap-2 pb-1 mt-3">
          {TAGS.map((t) => <button key={t.v} className={`chip !px-3 !py-2 !text-sm shrink-0 ${tag === t.v ? "chip-lime" : ""}`} onClick={() => setTag(t.v)}>{t.label}</button>)}
        </div>
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="text-xs text-muted">{compareMode ? "くらべる2つを選ぶ" : "タップで再生・メモ"}</div>
          <button className={`btn btn-sm ${compareMode ? "btn-blue" : "btn-ghost"}`} onClick={() => { setCompareMode((v) => !v); setCompare([]); }}>🔁 2つをくらべる</button>
        </div>
        {compareMode && compare.length === 2 && <CompareView ids={compare} onClose={() => { setCompareMode(false); setCompare([]); }} />}
        {list.length === 0 ? (
          <Card className="mt-3"><Empty text="まだ動画・写真がありません" sub="「＋ 追加」で練習の写真や動画を入れよう（複数まとめてOK）" /></Card>
        ) : view === "grid" ? (
          <div className="grid grid-cols-3 gap-1.5 mt-3">{list.map(tile)}</div>
        ) : (
          <div className="flex flex-col gap-3 mt-3">
            {groups.map((g) => (
              <Card key={g.date} className="!p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-display">{formatJa(g.date, true)} <span className="text-xs text-muted font-sans">{g.items.length} 件</span></div>
                  <Link href={`/note/?date=${g.date}`} className="btn btn-ghost btn-sm !min-h-8">📓 ノート</Link>
                </div>
                <div className="grid grid-cols-3 gap-1.5">{g.items.map(tile)}</div>
                {g.items.some((m) => m.comment) && (
                  <ul className="mt-2 text-xs text-white/85 space-y-0.5">
                    {g.items.filter((m) => m.comment).map((m) => <li key={m.id} className="truncate">{m.kind === "video" ? "▶" : "📷"} {m.comment}</li>)}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted mt-3 px-1">写真・動画はこの端末の中に保存される。「端末どうしの同期」をオンにしていると写真（縮小版）はもう一方の端末にも届く。動画は撮った端末だけ。日付の「📓 ノート」でその日の野球ノートへ。</p>
      </div>
      <ViewModal m={sel} onClose={() => setSel(null)} />
      <AddModal pending={pending} onClose={() => setPending([])} />
    </div>
  );
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
