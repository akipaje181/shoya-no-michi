"use client";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Empty, Field, Modal, NumberStepper, PageHeader, Segmented, Stat } from "@/components/ui";
import { useMediaUrl } from "@/components/Avatar";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { careerStats, deleteGame, fmtAvg, saveGame } from "@/lib/game";
import { celebrateGain } from "@/lib/celebrate";
import { formatJa, nowISO, today, uid } from "@/lib/date";
import { putBlob, shrinkPhoto, validateFile } from "@/lib/media";
import { IMG } from "@/lib/img";
import type { GameRecord, GameResult } from "@/lib/types";

export default function GamesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">読み込み中…</div>}>
      <Games />
    </Suspense>
  );
}

function Games() {
  const data = useAppData();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const prefill = params.get("date") ? { date: params.get("date")!, opponent: (params.get("title") || "").replace(/^(練習試合|公式戦|試合)\s*(vs\.?\s*)?/i, "") } : null;
  const [edit, setEdit] = useState<GameRecord | null>(null);
  const [adding, setAdding] = useState(!!prefill);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  const c = careerStats(data.games);
  const games = [...data.games].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <PageHeader title="試合記録" sub={`通算 ${c.games} 試合`} banner={IMG.banner("games")} right={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>＋ 試合</button>} />
      <div className="px-4">
        <Card>
          <div className="font-display text-base mb-2">📊 通算成績</div>
          <div className="grid grid-cols-4 gap-1">
            <Stat label="打率" value={fmtAvg(c.avg)} />
            <Stat label="安打" value={c.hits} />
            <Stat label="打点" value={c.rbi} />
            <Stat label="盗塁" value={c.steals} />
            <Stat label="打席" value={c.pa} />
            <Stat label="打数" value={c.ab} />
            <Stat label="得点" value={c.runs} />
            <Stat label="出塁率" value={fmtAvg(c.obp)} />
          </div>
          <div className="text-[11px] text-muted mt-2">チーム {c.wins}勝 {c.loses}敗{c.games - c.wins - c.loses > 0 ? ` ${c.games - c.wins - c.loses}分` : ""}</div>
        </Card>

        <div className="font-display text-lg mt-5 mb-2 px-1">⚾ 試合ごと</div>
        {games.length === 0 ? (
          <Card><Empty text="まだ試合の記録がありません" sub="「＋ 試合」から記録できます" /></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {games.map((g) => (
              <Card key={g.id} onClick={() => setEdit(g)}>
                <div className="flex items-center gap-2">
                  <span className={`chip ${g.result === "win" ? "chip-lime" : g.result === "lose" ? "" : "chip-blue"}`}>{g.result === "win" ? "勝ち" : g.result === "lose" ? "負け" : g.result === "draw" ? "引き分け" : "—"}</span>
                  <span className="font-bold flex-1 truncate">vs {g.opponent || "？"}</span>
                  <span className="text-xs text-muted">{formatJa(g.date)}</span>
                </div>
                {(g.scoreFor !== undefined || g.scoreAgainst !== undefined) && <div className="font-display text-xl mt-1 num">{g.scoreFor ?? "-"} - {g.scoreAgainst ?? "-"}{g.tournament ? <span className="text-xs text-muted font-sans ml-2">{g.tournament}</span> : null}</div>}
                <div className="flex gap-3 mt-2 text-sm num">
                  <span>{g.ab}打数 <b className="text-lime">{g.hits}安打</b></span>
                  <span>{g.rbi}打点</span>
                  <span>{g.runs}得点</span>
                  <span>{g.steals}盗塁</span>
                </div>
                {g.goodPlay && <div className="text-xs mt-2 text-white/85">🧤 {g.goodPlay}</div>}
                {g.didWell && <div className="text-xs mt-1 text-white/85">👍 {g.didWell}</div>}
                {g.mediaIds.length > 0 && <div className="flex gap-1 mt-2">{g.mediaIds.slice(0, 4).map((id) => <Thumb key={id} id={id} />)}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>
      <GameModal game={edit} open={!!edit || adding} prefill={prefill} onClose={() => { setEdit(null); setAdding(false); }} />
    </div>
  );
}

function Thumb({ id }: { id: string }) {
  const url = useMediaUrl(id);
  const data = useAppData();
  const m = data.media.find((x) => x.id === id);
  if (!url) return <div className="w-14 h-14 rounded-lg bg-black/25" />;
  return m?.kind === "video" ? <video src={url} className="w-14 h-14 rounded-lg object-cover" muted playsInline /> : <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover" />;
}

function blank(): GameRecord {
  return { id: uid("gm"), date: today(), opponent: "", result: "", pa: 0, ab: 0, hits: 0, rbi: 0, runs: 0, steals: 0, walks: 0, mediaIds: [], createdAt: nowISO(), updatedAt: nowISO() };
}

function GameModal({ game, open, onClose, prefill }: { game: GameRecord | null; open: boolean; onClose: () => void; prefill?: { date: string; opponent: string } | null }) {
  if (!open) return null;
  return <GameModalInner key={game?.id || "new"} game={game} onClose={onClose} prefill={prefill} />;
}

function GameModalInner({ game, onClose, prefill }: { game: GameRecord | null; onClose: () => void; prefill?: { date: string; opponent: string } | null }) {
  const data = useAppData();
  const [g, setG] = useState<GameRecord>(() => (game ? { ...game } : { ...blank(), ...(prefill ? { date: prefill.date, opponent: prefill.opponent, tournament: prefill.opponent ? "" : undefined } : {}) }));
  const fileRef = useRef<HTMLInputElement>(null);
  const open = true;
  const set = (p: Partial<GameRecord>) => setG({ ...g, ...p });
  const isNew = !data.games.some((x) => x.id === g.id);

  const save = () => {
    const fixed: GameRecord = { ...g, ab: Math.max(g.ab, g.hits), pa: Math.max(g.pa, g.ab) };
    let r: ReturnType<typeof saveGame> | null = null;
    updateData((d) => { r = saveGame(d, fixed); return r.data; });
    if (r) celebrateGain(r, "試合記録");
    onClose();
  };
  const addMedia = async (f: File) => {
    const v = validateFile(f);
    if (!v.ok) { alert(v.reason); return; }
    const blob = v.kind === "photo" ? await shrinkPhoto(f) : f;
    const id = uid("md");
    await putBlob(id, blob);
    updateData((d) => ({ ...d, media: [...d.media, { id, kind: v.kind, mime: blob.type || f.type, size: blob.size, date: g.date, tag: "game", comment: `vs ${g.opponent || "?"}`, createdAt: nowISO() }] }));
    setG({ ...g, mediaIds: [...g.mediaIds, id] });
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "試合を記録" : "試合を編集"} wide>
      <div className="grid grid-cols-2 gap-2">
        <Field label="試合日"><input className="input" type="date" value={g.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <Field label="大会・種類"><input className="input" value={g.tournament || ""} onChange={(e) => set({ tournament: e.target.value })} placeholder="練習試合／新人戦" /></Field>
      </div>
      <Field label="対戦相手"><input className="input" value={g.opponent} onChange={(e) => set({ opponent: e.target.value })} /></Field>
      <Field label="結果"><Segmented value={g.result} options={[{ v: "win" as GameResult, label: "勝ち" }, { v: "lose" as GameResult, label: "負け" }, { v: "draw" as GameResult, label: "引き分け" }, { v: "" as GameResult, label: "—" }]} onChange={(v) => set({ result: v })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="味方の点"><input className="input" type="number" inputMode="numeric" value={g.scoreFor ?? ""} onChange={(e) => set({ scoreFor: e.target.value === "" ? undefined : +e.target.value })} /></Field>
        <Field label="相手の点"><input className="input" type="number" inputMode="numeric" value={g.scoreAgainst ?? ""} onChange={(e) => set({ scoreAgainst: e.target.value === "" ? undefined : +e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="打順"><input className="input" type="number" inputMode="numeric" value={g.battingOrder ?? ""} onChange={(e) => set({ battingOrder: e.target.value === "" ? undefined : +e.target.value })} placeholder="例：1" /></Field>
        <Field label="守備位置"><input className="input" value={g.position || ""} onChange={(e) => set({ position: e.target.value })} placeholder="例：ショート" /></Field>
      </div>
      <div className="font-display text-base mt-2 mb-1">🏏 打撃</div>
      <div className="grid grid-cols-2 gap-x-3">
        <Field label="打席数"><NumberStepper value={g.pa} onChange={(v) => set({ pa: v })} /></Field>
        <Field label="打数"><NumberStepper value={g.ab} onChange={(v) => set({ ab: v })} /></Field>
        <Field label="安打"><NumberStepper value={g.hits} onChange={(v) => set({ hits: v })} /></Field>
        <Field label="四死球"><NumberStepper value={g.walks || 0} onChange={(v) => set({ walks: v })} /></Field>
        <Field label="打点"><NumberStepper value={g.rbi} onChange={(v) => set({ rbi: v })} /></Field>
        <Field label="得点"><NumberStepper value={g.runs} onChange={(v) => set({ runs: v })} /></Field>
        <Field label="盗塁"><NumberStepper value={g.steals} onChange={(v) => set({ steals: v })} /></Field>
        <Field label="ホームラン"><NumberStepper value={g.homeruns || 0} onChange={(v) => set({ homeruns: v })} /></Field>
      </div>
      <p className="text-[11px] text-muted mb-3">打席数＝打数＋四死球＋犠打など。わからなければ打数だけでOK。</p>
      <Field label="🧤 守備の良かったプレー"><textarea className="input" value={g.goodPlay || ""} onChange={(e) => set({ goodPlay: e.target.value })} placeholder="例：ショートゴロを正面で捕って1塁アウト" /></Field>
      <Field label="👍 今日できたこと"><textarea className="input" value={g.didWell || ""} onChange={(e) => set({ didWell: e.target.value })} /></Field>
      <Field label="📝 今日の反省（次はこうする）"><textarea className="input" value={g.reflection || ""} onChange={(e) => set({ reflection: e.target.value })} /></Field>
      {g.mediaIds.length > 0 && <div className="flex gap-2 mb-2 flex-wrap">{g.mediaIds.map((id) => <Thumb key={id} id={id} />)}</div>}
      <button className="btn btn-ghost btn-sm w-full mb-3" onClick={() => fileRef.current?.click()}>📷 写真・動画を追加</button>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addMedia(f); e.target.value = ""; }} />
      <div className="flex gap-2">
        {!isNew && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm("この試合の記録を消しますか？")) { updateData((d) => deleteGame(d, g.id)); onClose(); } }}>消す</button>}
        <button className="btn btn-primary flex-1" onClick={save}>{isNew ? `保存（+${data.settings.xpRules.gameRecord} XP）` : "保存"}</button>
      </div>
    </Modal>
  );
}
