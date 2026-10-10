"use client";
// 予定：チーム練習・試合・大会のスケジュール
import { useState } from "react";
import Link from "next/link";
import { Card, Empty, Field, Modal, PageHeader, Segmented } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { formatJa, monthLabel, nowISO, toISODate, today, uid } from "@/lib/date";
import { KIND_COLOR, KIND_ICON, KIND_LABEL, relativeLabel, sortEvents, upcoming } from "@/lib/schedule";
import type { EventKind, ScheduleEvent } from "@/lib/types";

export default function SchedulePage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const t = today();
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState<string>(t);
  const [edit, setEdit] = useState<ScheduleEvent | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  const first = new Date(ym.y, ym.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(ym.y, ym.m, i + 1)))];
  const byDate = new Map<string, ScheduleEvent[]>();
  for (const e of data.events) byDate.set(e.date, [...(byDate.get(e.date) || []), e]);
  const practiced = new Set(data.records.map((r) => r.date));
  const selEvents = sortEvents(byDate.get(sel) || []);
  const next = upcoming(data, 60);

  return (
    <div>
      <PageHeader title="予定" sub="チーム練習・試合・大会" right={<button className="btn btn-primary btn-sm" onClick={() => setAddDate(sel)}>＋ 予定</button>} />
      <div className="px-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}>◀</button>
            <div className="font-display text-lg">{monthLabel(ym.y, ym.m)}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}>▶</button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-muted font-bold mb-1">
            {["日", "月", "火", "水", "木", "金", "土"].map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`p${i}`} />;
              const evs = byDate.get(d) || [];
              const isSel = d === sel;
              const isToday = d === t;
              const main = evs.find((e) => e.kind === "tournament") || evs.find((e) => e.kind === "game") || evs[0];
              return (
                <button
                  key={d}
                  onClick={() => setSel(d)}
                  onDoubleClick={() => setAddDate(d)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold ${isSel ? "bg-blue text-white" : main ? (main.kind === "practice" ? "bg-blue/20 text-white" : main.kind === "game" ? "bg-lime/20 text-lime" : main.kind === "tournament" ? "bg-gold/25 text-gold" : "bg-white/10") : "bg-black/15 text-white/70"} ${isToday ? "ring-2 ring-lime" : ""}`}
                >
                  <span className="num">{Number(d.slice(-2))}</span>
                  <span className="text-[10px] leading-none">{main ? KIND_ICON[main.kind] : practiced.has(d) ? "·" : ""}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-muted">
            <span>🏃 チーム練習</span><span>⚾ 試合</span><span>🏆 大会</span><span>📌 そのほか</span>
          </div>
        </Card>

        <div className="flex items-center justify-between mt-5 mb-2 px-1">
          <div className="font-display text-lg">{formatJa(sel)} <span className="text-xs text-muted font-sans">{relativeLabel(sel)}</span></div>
          <button className="btn btn-ghost btn-sm" onClick={() => setAddDate(sel)}>＋ この日に予定</button>
        </div>
        {selEvents.length === 0 ? (
          <Card><div className="text-center text-muted py-3 text-sm">この日の予定はありません</div></Card>
        ) : (
          <div className="flex flex-col gap-2">{selEvents.map((e) => <EventCard key={e.id} e={e} onClick={() => setEdit(e)} />)}</div>
        )}

        <div className="font-display text-lg mt-6 mb-2 px-1">📅 これからの予定（60日）</div>
        {next.length === 0 ? (
          <Card><Empty text="予定がありません" sub="「＋ 予定」でチーム練習や試合を入れよう" /></Card>
        ) : (
          <div className="flex flex-col gap-2">{next.map((e) => <EventCard key={e.id} e={e} showDate onClick={() => setEdit(e)} />)}</div>
        )}
      </div>
      {(edit || addDate) && <EventModal key={edit?.id || addDate || "x"} ev={edit} date={addDate || sel} onClose={() => { setEdit(null); setAddDate(null); }} />}
    </div>
  );
}

function EventCard({ e, showDate, onClick }: { e: ScheduleEvent; showDate?: boolean; onClick: () => void }) {
  const t = today();
  const isGameDay = (e.kind === "game" || e.kind === "tournament") && e.date <= t;
  return (
    <Card className="flex items-center gap-3" onClick={onClick}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${KIND_COLOR[e.kind]}`}>{KIND_ICON[e.kind]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`chip !text-[10px] ${KIND_COLOR[e.kind]}`}>{KIND_LABEL[e.kind]}</span>
          {showDate && <span className="text-xs text-muted">{formatJa(e.date)}　<b className="text-white/90">{relativeLabel(e.date)}</b></span>}
        </div>
        <div className="font-bold truncate mt-0.5">{e.title}</div>
        <div className="text-xs text-muted truncate">{[e.time, e.place].filter(Boolean).join("　")}</div>
        {e.memo && <div className="text-xs text-white/80 mt-1 whitespace-pre-wrap">{e.memo}</div>}
      </div>
      {isGameDay ? (
        <Link href={`/games/?date=${e.date}&title=${encodeURIComponent(e.title)}`} className="btn btn-blue btn-sm shrink-0" onClick={(ev) => ev.stopPropagation()}>記録</Link>
      ) : (
        <span className="text-muted">›</span>
      )}
    </Card>
  );
}

function EventModal({ ev, date, onClose }: { ev: ScheduleEvent | null; date: string; onClose: () => void }) {
  const [e, setE] = useState<ScheduleEvent>(() => ev ? { ...ev } : { id: uid("ev"), date, kind: "practice", title: "", createdAt: nowISO() });
  const set = (p: Partial<ScheduleEvent>) => setE({ ...e, ...p });
  const isNew = !ev;
  const save = () => {
    const title = e.title.trim() || KIND_LABEL[e.kind];
    updateData((d) => ({ ...d, events: isNew ? [...d.events, { ...e, title }] : d.events.map((x) => (x.id === e.id ? { ...e, title } : x)) }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={isNew ? "予定を入れる" : "予定を直す"}>
      <Field label="種類">
        <Segmented value={e.kind} options={[{ v: "practice" as EventKind, label: "🏃 練習" }, { v: "game" as EventKind, label: "⚾ 試合" }, { v: "tournament" as EventKind, label: "🏆 大会" }, { v: "other" as EventKind, label: "📌 他" }]} onChange={(v) => set({ kind: v })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="日付"><input className="input" type="date" value={e.date} onChange={(ev2) => set({ date: ev2.target.value })} /></Field>
        <Field label="時間"><input className="input" type="time" value={e.time || ""} onChange={(ev2) => set({ time: ev2.target.value })} /></Field>
      </div>
      <Field label="なに？" hint="空欄なら種類の名前になります">
        <input className="input" value={e.title} onChange={(ev2) => set({ title: ev2.target.value })} placeholder={e.kind === "game" ? "練習試合 vs ○○" : e.kind === "tournament" ? "新人戦 1回戦" : e.kind === "practice" ? "チーム練習" : "用具の買い出し など"} />
      </Field>
      <div className="flex flex-wrap gap-1 mb-3">
        {(e.kind === "practice" ? ["チーム練習", "午前練習", "午後練習", "自主練"] : e.kind === "game" ? ["練習試合", "公式戦", "紅白戦"] : e.kind === "tournament" ? ["新人戦", "リーグ戦", "トーナメント", "決勝"] : ["集合", "買い出し", "写真撮影"]).map((s) => (
          <button key={s} type="button" className="chip !text-xs" onClick={() => set({ title: e.title ? `${e.title} ${s}`.trim() : s })}>{s}</button>
        ))}
      </div>
      <Field label="場所"><input className="input" value={e.place || ""} onChange={(ev2) => set({ place: ev2.target.value })} placeholder="○○グラウンド" /></Field>
      <Field label="メモ（持ち物・集合時間など）"><textarea className="input" value={e.memo || ""} onChange={(ev2) => set({ memo: ev2.target.value })} /></Field>
      <div className="flex gap-2">
        {!isNew && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm("この予定を消しますか？")) { updateData((d) => ({ ...d, events: d.events.filter((x) => x.id !== e.id) })); onClose(); } }}>消す</button>}
        <button className="btn btn-primary flex-1" onClick={save}>保存</button>
      </div>
    </Modal>
  );
}
