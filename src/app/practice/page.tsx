"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Field, Modal, NumberStepper, PageHeader } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { completeMission, markRestDay, xpOnDate } from "@/lib/game";
import { celebrateGain, pushCelebrate } from "@/lib/celebrate";
import { today, formatJa } from "@/lib/date";
import type { Measured, PracticeMenu } from "@/lib/types";

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">読み込み中…</div>}>
      <Practice />
    </Suspense>
  );
}

function Practice() {
  const data = useAppData();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const t = today();
  const [openId, setOpenId] = useState<string | null>(null);
  const paramId = params.get("menu");
  const open = hydrated ? data.menus.find((x) => x.id === (openId ?? paramId)) || null : null;

  useEffect(() => {
    if (paramId === "quiz") router.replace("/quiz");
  }, [paramId, router]);

  const menus = data.menus.filter((m) => m.active).sort((a, b) => a.order - b.order);
  const doneToday = new Set(data.completions.filter((c) => c.date === t).map((c) => c.menuId));
  const recToday = data.records.filter((r) => r.date === t);
  const clear = menus.filter((m) => doneToday.has(m.id)).length;
  const restToday = data.restDays.some((r) => r.date === t);

  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  return (
    <div>
      <PageHeader title="きょうのミッション" sub={formatJa(t)} right={<Link href="/practice/history" className="btn btn-ghost btn-sm">📅 履歴</Link>} />
      <div className="px-4">
        <Card className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted font-bold">クリア</div>
            <div className="font-display text-3xl num">{clear} <span className="text-base text-muted">/ {menus.length}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted font-bold">きょうのXP</div>
            <div className="font-display text-3xl text-lime num">+{xpOnDate(data, t)}</div>
          </div>
        </Card>
        {clear === menus.length && menus.length > 0 && (
          <div className="mt-2 text-center font-display text-lime text-lg pop">🎉 ALL CLEAR! きょうも最高！</div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {menus.map((m) => {
            const done = doneToday.has(m.id);
            const rec = recToday.find((r) => r.menuId === m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={`card p-4 text-left tap flex items-center gap-3 ${done ? "!border-lime/60" : ""}`}
                onClick={() => (m.id === "quiz" ? router.push("/quiz") : setOpenId(m.id))}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${done ? "bg-lime text-navy" : "bg-black/25"}`}>{done ? "✓" : m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{m.name}</div>
                  <div className="text-xs text-muted">
                    {rec ? `きょう ${rec.amount}${m.unit === "count" ? "回" : "分"}` : `目安 ${m.defaultTarget}${m.unit === "count" ? "回" : "分"}`}
                  </div>
                </div>
                <div className={`chip ${done ? "chip-lime" : ""}`}>{done ? "クリア" : `+${m.xp} XP`}</div>
              </button>
            );
          })}
        </div>

        {!restToday && recToday.length === 0 && (
          <button
            type="button"
            className="btn btn-ghost w-full mt-4"
            onClick={() => {
              updateData((d) => markRestDay(d, t));
              pushCelebrate({ type: "text", text: "きょうは休養日。しっかり休もう！", icon: "😴" });
            }}
          >
            😴 きょうは休養日にする
          </button>
        )}
        <p className="text-[11px] text-muted mt-3 px-1">同じミッションのXPは1日1回。追加でやった分は回数に足されます。</p>
      </div>

      {open && <MissionModal key={open.id} menu={open} onClose={() => { setOpenId(null); if (paramId) router.replace("/practice"); }} />}
    </div>
  );
}

function MissionModal({ menu, onClose }: { menu: PracticeMenu; onClose: () => void }) {
  const data = useAppData();
  const t = today();
  const [amount, setAmount] = useState(menu.defaultTarget);
  const [memo, setMemo] = useState("");
  const [m, setM] = useState<Measured>({});
  const [showMeasure, setShowMeasure] = useState(false);

  const done = data.completions.some((c) => c.key === `${t}:${menu.id}`);
  const unit = menu.unit === "count" ? "回" : "分";
  const canMeasure = menu.category === "fielding" || menu.category === "throwing" || menu.category === "running";

  const submit = () => {
    const measured: Measured = {};
    if (m.catchTry) { measured.catchTry = m.catchTry; measured.catchOk = Math.min(m.catchOk || 0, m.catchTry); }
    if (m.throwTry) { measured.throwTry = m.throwTry; measured.throwOk = Math.min(m.throwOk || 0, m.throwTry); }
    if (m.run20m) measured.run20m = m.run20m;
    let result: ReturnType<typeof completeMission> | null = null;
    updateData((d) => {
      result = completeMission(d, menu.id, amount, { date: t, memo: memo.trim() || undefined, measured: Object.keys(measured).length ? measured : undefined });
      return result.data;
    });
    if (result) {
      const r = result as ReturnType<typeof completeMission>;
      if (r.xpGained > 0) celebrateGain(r, menu.name);
      else pushCelebrate({ type: "text", text: "記録に足しました（XPは1日1回）", icon: "📝" });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`${menu.icon} ${menu.name}`}>
      {done && <div className="chip chip-lime mb-3">✅ きょうはクリア済み。追加の分を記録できます</div>}
      <Field label={`やった${unit === "回" ? "回数" : "時間"}`}>
        <NumberStepper value={amount} onChange={setAmount} step={unit === "回" ? 10 : 5} unit={unit} quick={unit === "回" ? [10, 50, 100] : [5, 10, 30]} />
      </Field>
      {canMeasure && (
        <div className="mb-3">
          <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => setShowMeasure((v) => !v)}>
            📏 きょうの実測を入れる {showMeasure ? "▲" : "▼"}
          </button>
          {showMeasure && (
            <div className="mt-2 rounded-xl bg-black/20 p-3">
              {menu.category === "fielding" && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="ゴロ 何本"><input className="input" type="number" inputMode="numeric" value={m.catchTry || ""} onChange={(e) => setM({ ...m, catchTry: +e.target.value })} /></Field>
                  <Field label="うち 捕れた"><input className="input" type="number" inputMode="numeric" value={m.catchOk || ""} onChange={(e) => setM({ ...m, catchOk: +e.target.value })} /></Field>
                </div>
              )}
              {menu.category === "throwing" && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="送球 何本"><input className="input" type="number" inputMode="numeric" value={m.throwTry || ""} onChange={(e) => setM({ ...m, throwTry: +e.target.value })} /></Field>
                  <Field label="うち 届いた"><input className="input" type="number" inputMode="numeric" value={m.throwOk || ""} onChange={(e) => setM({ ...m, throwOk: +e.target.value })} /></Field>
                </div>
              )}
              {menu.category === "running" && (
                <Field label="20m走 タイム（秒）" hint="例：4.2"><input className="input" type="number" inputMode="decimal" step="0.01" value={m.run20m || ""} onChange={(e) => setM({ ...m, run20m: +e.target.value })} /></Field>
              )}
            </div>
          )}
        </div>
      )}
      <Field label="メモ（コーチに言われたこと・気づき）">
        <textarea className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例：ゴロは正面に入る！" />
      </Field>
      <button className="btn btn-primary w-full text-lg" onClick={submit} disabled={amount <= 0}>
        {done ? "📝 記録に足す" : `✅ ミッション達成！ +${menu.xp} XP`}
      </button>
    </Modal>
  );
}
