"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, Empty, MenuIcon, Modal, PageHeader, Field } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { deleteRecord, editRecord } from "@/lib/game";
import { today, toISODate, formatJa, monthLabel } from "@/lib/date";
import type { PracticeRecord } from "@/lib/types";

export default function HistoryPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const t = today();
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState<string>(t);
  const [edit, setEdit] = useState<PracticeRecord | null>(null);

  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  const menuOf = (id: string) => data.menus.find((m) => m.id === id);
  const first = new Date(ym.y, ym.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(ym.y, ym.m, i + 1)))];
  const byDate = new Map<string, PracticeRecord[]>();
  for (const r of data.records) byDate.set(r.date, [...(byDate.get(r.date) || []), r]);
  const rest = new Set(data.restDays.map((r) => r.date));
  const games = new Set(data.games.map((g) => g.date));
  const events = new Map(data.events.map((e) => [e.date, e.kind]));
  const selRecs = (byDate.get(sel) || []).slice().sort((a, b) => (menuOf(a.menuId)?.order || 0) - (menuOf(b.menuId)?.order || 0));
  const monthRecs = data.records.filter((r) => r.date.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, "0")}`));
  const monthDays = new Set(monthRecs.map((r) => r.date)).size;
  const monthSwings = monthRecs.filter((r) => r.menuId === "swing").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader title="練習の履歴" back="/practice" right={<Link href="/schedule" className="btn btn-ghost btn-sm">📅 予定</Link>} />
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
              const recs = byDate.get(d) || [];
              const n = recs.length;
              const isSel = d === sel;
              const isToday = d === t;
              return (
                <button
                  key={d}
                  onClick={() => setSel(d)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold relative ${isSel ? "bg-blue text-white" : n > 0 ? "bg-lime/20 text-lime" : rest.has(d) ? "bg-white/5 text-muted" : "bg-black/15 text-white/70"} ${isToday ? "ring-2 ring-lime" : ""}`}
                >
                  <span className="num">{Number(d.slice(-2))}</span>
                  <span className="text-[10px] leading-none">{games.has(d) ? "⚾" : n > 0 ? "●".repeat(Math.min(3, n)) : rest.has(d) ? "休" : events.has(d) ? (events.get(d) === "tournament" ? "🏆" : events.get(d) === "game" ? "⚾" : "·") : ""}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 text-[11px] text-muted">
            <span>この月：練習 <b className="text-white num">{monthDays}</b> 日</span>
            <span>素振り <b className="text-white num">{monthSwings}</b> 回</span>
          </div>
        </Card>

        <div className="font-display text-lg mt-5 mb-2 px-1">{formatJa(sel)}</div>
        {selRecs.length === 0 ? (
          <Card><Empty text={rest.has(sel) ? "休養日" : "この日の記録はありません"} /></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {selRecs.map((r) => {
              const m = menuOf(r.menuId);
              return (
                <Card key={r.id} className="flex items-start gap-3" onClick={() => setEdit(r)}>
                  {m ? <MenuIcon menu={m} size={40} /> : <div className="text-2xl">📝</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{m?.name || r.menuId} <span className="text-lime num">{r.amount}{m?.unit === "min" ? "分" : "回"}</span></div>
                    {r.measured && (
                      <div className="text-[11px] text-muted">
                        {r.measured.catchTry ? `捕球 ${r.measured.catchOk}/${r.measured.catchTry} ` : ""}
                        {r.measured.throwTry ? `送球 ${r.measured.throwOk}/${r.measured.throwTry} ` : ""}
                        {r.measured.run20m ? `20m走 ${r.measured.run20m}秒` : ""}
                      </div>
                    )}
                    {r.memo && <div className="text-sm text-white/85 mt-1 whitespace-pre-wrap">{r.memo}</div>}
                  </div>
                  <span className="text-muted text-xs">編集</span>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <EditModal rec={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function EditModal({ rec, onClose }: { rec: PracticeRecord | null; onClose: () => void }) {
  const data = useAppData();
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState("");
  const [key, setKey] = useState("");
  if (rec && key !== rec.id) { setKey(rec.id); setAmount(rec.amount); setMemo(rec.memo || ""); }
  if (!rec) return null;
  const m = data.menus.find((x) => x.id === rec.menuId);
  return (
    <Modal open={!!rec} onClose={onClose} title={`${m?.icon || ""} ${m?.name || ""} の記録を直す`}>
      <Field label={m?.unit === "min" ? "時間（分）" : "回数"}>
        <input className="input" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(+e.target.value)} />
      </Field>
      <Field label="メモ"><textarea className="input" value={memo} onChange={(e) => setMemo(e.target.value)} /></Field>
      <div className="flex gap-2">
        <button className="btn btn-danger btn-sm" onClick={() => { if (confirm("この記録を消しますか？（XPは残ります）")) { updateData((d) => deleteRecord(d, rec.id)); onClose(); } }}>消す</button>
        <button className="btn btn-primary flex-1" onClick={() => { updateData((d) => editRecord(d, rec.id, { amount: Math.max(0, amount), memo: memo.trim() || undefined })); onClose(); }}>保存</button>
      </div>
    </Modal>
  );
}
