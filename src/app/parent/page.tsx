"use client";
// パパの応援（保護者画面）。4桁 PIN で保護
import { useRef, useState } from "react";
import Link from "next/link";
import { Card, Field, MenuIcon, Modal, PageHeader, Segmented } from "@/components/ui";
import { IMG } from "@/lib/img";
import { useAppData, updateData, useHydrated, replaceData, resetData, flushSave, getData } from "@/lib/store";
import { clearBlobs } from "@/lib/media";
import { careerStats, fmtAvg, practiceDays, streak } from "@/lib/game";
import { levelFromXp, totalXp } from "@/lib/level";
import { addDays, formatJa, nowISO, today, uid } from "@/lib/date";
import type { AppData, PracticeMenu, MenuCategory, Reward } from "@/lib/types";
import { pushCelebrate } from "@/lib/celebrate";

export default function ParentPage() {
  const hydrated = useHydrated();
  const [unlocked, setUnlocked] = useState(() => { try { return typeof window !== "undefined" && sessionStorage.getItem("shoya.parent") === "1"; } catch { return false; } });
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  if (!unlocked) return <PinGate onUnlock={() => { setUnlocked(true); try { sessionStorage.setItem("shoya.parent", "1"); } catch { /* ignore */ } }} />;
  return <Dashboard onLock={() => { setUnlocked(false); try { sessionStorage.removeItem("shoya.parent"); } catch { /* ignore */ } }} />;
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const data = useAppData();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const setup = !data.settings.parentPin;
  const submit = () => {
    if (setup) {
      if (!/^\d{4}$/.test(pin)) { setErr("数字4けたで決めてください"); return; }
      if (pin !== pin2) { setErr("2回目が合っていません"); return; }
      updateData((d) => ({ ...d, settings: { ...d.settings, parentPin: pin } }));
      onUnlock();
    } else if (pin === data.settings.parentPin) onUnlock();
    else { setErr("ちがいます"); setPin(""); }
  };
  return (
    <div>
      <PageHeader title="パパの応援" sub="保護者用" back="/home" banner={IMG.banner("parent")} />
      <div className="px-4">
        <Card className="text-center">
          <div className="text-4xl mb-2">🔒</div>
          <div className="font-bold">{setup ? "保護者用のPIN（数字4けた）を決めてください" : "PINを入れてください"}</div>
          <input className="input text-center font-display text-3xl tracking-[0.5em] mt-3" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} autoFocus />
          {setup && <input className="input text-center font-display text-3xl tracking-[0.5em] mt-2" type="password" inputMode="numeric" maxLength={4} placeholder="もう一度" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />}
          {err && <div className="text-red-300 text-sm mt-2">{err}</div>}
          <button className="btn btn-primary w-full mt-4" onClick={submit}>{setup ? "決める" : "開く"}</button>
          {setup && <p className="text-[11px] text-muted mt-3">PINは この端末の中にだけ保存されます。忘れたときは「バックアップ → 読み込み」で保存ファイルから戻せます。</p>}
        </Card>
      </div>
    </div>
  );
}

type Tab = "cheer" | "records" | "rewards" | "menus" | "settings" | "data";

function Dashboard({ onLock }: { onLock: () => void }) {
  const data = useAppData();
  const [tab, setTab] = useState<Tab>("cheer");
  return (
    <div>
      <PageHeader title="パパの応援" sub="保護者用の管理画面" back="/home" banner={IMG.banner("parent")} right={<button className="btn btn-ghost btn-sm" onClick={onLock}>🔒 ロック</button>} />
      <div className="px-4">
        <div className="scroll-x flex gap-2 pb-1">
          {([["cheer", "💬 応援"], ["records", "📋 記録"], ["rewards", "🍖 ご褒美"], ["menus", "🎯 メニュー"], ["settings", "⚙️ XP設定"], ["data", "💾 データ"]] as [Tab, string][]).map(([v, l]) => (
            <button key={v} className={`chip !px-3 !py-2 !text-sm shrink-0 ${tab === v ? "chip-lime" : ""}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>
        <div className="mt-3">
          {tab === "cheer" && <CheerTab />}
          {tab === "records" && <RecordsTab />}
          {tab === "rewards" && <RewardsTab />}
          {tab === "menus" && <MenusTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "data" && <DataTab />}
        </div>
        <div className="text-[11px] text-muted mt-6">親の名前：{data.settings.parentName}（XP設定で変えられます）</div>
      </div>
    </div>
  );
}

const CHEER_TEMPLATES = ["きょうも練習がんばったね！", "素振りの音が良くなってきた！", "ゴロの構え、かっこよかったよ。", "次の試合、楽しみにしてる！", "失敗してもいい。挑戦したのがすごい。", "パパはいつでも応援してる。"];

function CheerTab() {
  const data = useAppData();
  const [text, setText] = useState("");
  const send = (t: string) => {
    if (!t.trim()) return;
    updateData((d) => ({ ...d, messages: [...d.messages, { id: uid("msg"), date: today(), text: t.trim(), from: d.settings.parentName, createdAt: nowISO() }] }));
    setText("");
    pushCelebrate({ type: "text", text: "応援メッセージを送りました", icon: "💬" });
  };
  const msgs = [...data.messages].reverse();
  return (
    <div>
      <Card>
        <div className="font-display text-base mb-2">💬 応援メッセージを送る</div>
        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="奨也のホーム画面に表示されます" />
        <div className="flex flex-wrap gap-1 mt-2">
          {CHEER_TEMPLATES.map((t) => <button key={t} className="chip !text-xs" onClick={() => setText(t)}>{t}</button>)}
        </div>
        <button className="btn btn-primary w-full mt-3" onClick={() => send(text)} disabled={!text.trim()}>送る</button>
      </Card>
      <div className="font-display text-base mt-4 mb-2 px-1">送った応援</div>
      {msgs.length === 0 ? <Card><div className="text-center text-muted py-3">まだありません</div></Card> : (
        <div className="flex flex-col gap-1">
          {msgs.map((m) => (
            <div key={m.id} className="card px-3 py-2 flex items-center gap-2 text-sm">
              <span className="flex-1">{m.text}</span>
              <span className="text-[10px] text-muted">{formatJa(m.date)}</span>
              <button className="text-muted text-xs" onClick={() => updateData((d) => ({ ...d, messages: d.messages.filter((x) => x.id !== m.id) }))}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordsTab() {
  const data = useAppData();
  const lv = levelFromXp(totalXp(data));
  const c = careerStats(data.games);
  const recent = [...data.records].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 30);
  const menuOf = (id: string) => data.menus.find((m) => m.id === id);
  const swings = data.records.filter((r) => r.menuId === "swing").reduce((s, r) => s + r.amount, 0);
  const last7 = new Set(data.records.filter((r) => r.date >= addDays(today(), -6)).map((r) => r.date)).size;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Card><div className="text-[11px] text-muted">レベル / 総XP</div><div className="font-display text-2xl">Lv.{lv.level} <span className="text-sm text-muted">{lv.total} XP</span></div></Card>
        <Card><div className="text-[11px] text-muted">練習した日 / 連続</div><div className="font-display text-2xl">{practiceDays(data)}日 <span className="text-sm text-muted">連続{streak(data)}日</span></div></Card>
        <Card><div className="text-[11px] text-muted">直近7日の練習日数</div><div className="font-display text-2xl">{last7} / 7</div></Card>
        <Card><div className="text-[11px] text-muted">通算素振り / 打率</div><div className="font-display text-2xl">{swings}回 <span className="text-sm text-muted">{fmtAvg(c.avg)}</span></div></Card>
      </div>
      <div className="flex gap-2 mt-3">
        <Link href="/growth" className="btn btn-ghost btn-sm flex-1">📈 成長グラフ</Link>
        <Link href="/practice/history" className="btn btn-ghost btn-sm flex-1">📅 カレンダー</Link>
        <Link href="/album" className="btn btn-ghost btn-sm flex-1">🎬 動画</Link>
      </div>
      <div className="font-display text-base mt-4 mb-2 px-1">最近の練習</div>
      <div className="flex flex-col gap-1">
        {recent.length === 0 && <Card><div className="text-center text-muted py-3">まだ記録がありません</div></Card>}
        {recent.map((r) => (
          <div key={r.id} className="card px-3 py-2 text-sm">
            <div className="flex items-center gap-2">{menuOf(r.menuId) ? <MenuIcon menu={menuOf(r.menuId)!} size={28} /> : <span>📝</span>}<span className="font-bold flex-1">{menuOf(r.menuId)?.name} {r.amount}{menuOf(r.menuId)?.unit === "min" ? "分" : "回"}</span><span className="text-[10px] text-muted">{formatJa(r.date)}</span></div>
            {r.memo && <div className="text-xs text-white/80 mt-1 whitespace-pre-wrap">{r.memo}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RewardsTab() {
  const data = useAppData();
  const [title, setTitle] = useState("");
  const [cond, setCond] = useState("");
  const add = () => {
    if (!title.trim()) return;
    updateData((d) => ({ ...d, rewards: [...d.rewards, { id: uid("rw"), title: title.trim(), condition: cond.trim(), status: "approved", createdAt: nowISO() }] }));
    setTitle(""); setCond("");
  };
  const setStatus = (id: string, status: Reward["status"]) => updateData((d) => ({ ...d, rewards: d.rewards.map((r) => (r.id === id ? { ...r, status, doneAt: status === "done" ? nowISO() : r.doneAt } : r)) }));
  return (
    <div>
      <Card>
        <div className="font-display text-base mb-2">🍖 現実のご褒美を決める</div>
        <Field label="ご褒美"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：焼肉に行く" /></Field>
        <Field label="条件"><input className="input" value={cond} onChange={(e) => setCond(e.target.value)} placeholder="例：Lv.10 になったら／新人戦が終わったら" /></Field>
        <div className="flex flex-wrap gap-1 mb-2">{["焼肉", "好きなご飯", "家族でお祝い", "回転寿司"].map((t) => <button key={t} className="chip !text-xs" onClick={() => setTitle(t)}>{t}</button>)}</div>
        <button className="btn btn-primary w-full" onClick={add} disabled={!title.trim()}>追加（本人のホームに表示）</button>
      </Card>
      <div className="font-display text-base mt-4 mb-2 px-1">ご褒美リスト</div>
      <div className="flex flex-col gap-1">
        {data.rewards.length === 0 && <Card><div className="text-center text-muted py-3">まだありません</div></Card>}
        {data.rewards.map((r) => (
          <div key={r.id} className={`card px-3 py-2 text-sm ${r.status === "done" ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2"><span className="font-bold flex-1">{r.title}</span><span className={`chip ${r.status === "done" ? "chip-lime" : "chip-gold"}`}>{r.status === "done" ? "達成" : "約束中"}</span></div>
            {r.condition && <div className="text-xs text-muted">{r.condition}</div>}
            <div className="flex gap-2 mt-2">
              {r.status !== "done" && <button className="btn btn-primary btn-sm" onClick={() => setStatus(r.id, "done")}>🎉 達成した</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => updateData((d) => ({ ...d, rewards: d.rewards.filter((x) => x.id !== r.id) }))}>消す</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CATS: { v: MenuCategory; label: string }[] = [
  { v: "swing", label: "打撃" }, { v: "fielding", label: "守備" }, { v: "throwing", label: "送球" }, { v: "footwork", label: "足さばき" }, { v: "running", label: "走塁" }, { v: "stretch", label: "体づくり" }, { v: "free", label: "自由" },
];

function MenusTab() {
  const data = useAppData();
  const [edit, setEdit] = useState<PracticeMenu | null>(null);
  const [adding, setAdding] = useState(false);
  const menus = [...data.menus].sort((a, b) => a.order - b.order);
  const move = (id: string, dir: -1 | 1) => updateData((d) => {
    const s = [...d.menus].sort((a, b) => a.order - b.order);
    const i = s.findIndex((m) => m.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.length) return d;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...d, menus: s.map((m, k) => ({ ...m, order: k + 1 })) };
  });
  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-2"><div className="font-display text-base">🎯 練習メニュー</div><button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>＋ 追加</button></div>
      <p className="text-[11px] text-muted mb-2 px-1">目安の回数・時間とXPを変えて練習量を調整できます。「出す」をオフにすると今日のミッションに出ません。</p>
      <div className="flex flex-col gap-1">
        {menus.map((m, i) => (
          <div key={m.id} className={`card px-3 py-2 flex items-center gap-2 text-sm ${m.active ? "" : "opacity-50"}`}>
            <MenuIcon menu={m} size={32} />
            <div className="flex-1 min-w-0"><div className="font-bold truncate">{m.name}</div><div className="text-[11px] text-muted">目安 {m.defaultTarget}{m.unit === "min" ? "分" : "回"}・{m.xp} XP</div></div>
            <button className="btn btn-ghost btn-sm !min-h-8 !px-2" onClick={() => move(m.id, -1)} disabled={i === 0}>↑</button>
            <button className="btn btn-ghost btn-sm !min-h-8 !px-2" onClick={() => move(m.id, 1)} disabled={i === menus.length - 1}>↓</button>
            <button className={`chip ${m.active ? "chip-lime" : ""}`} onClick={() => updateData((d) => ({ ...d, menus: d.menus.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)) }))}>{m.active ? "出す" : "出さない"}</button>
            <button className="btn btn-ghost btn-sm !min-h-8 !px-2" onClick={() => setEdit(m)}>✏️</button>
          </div>
        ))}
      </div>
      <MenuModal menu={edit} open={!!edit || adding} onClose={() => { setEdit(null); setAdding(false); }} />
    </div>
  );
}

function MenuModal({ menu, open, onClose }: { menu: PracticeMenu | null; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <MenuModalInner key={menu?.id || "new"} menu={menu} onClose={onClose} />;
}

function MenuModalInner({ menu, onClose }: { menu: PracticeMenu | null; onClose: () => void }) {
  const data = useAppData();
  const [m, setM] = useState<PracticeMenu>(() => (menu ? { ...menu } : { id: uid("mn"), name: "", icon: "⚾", category: "free", unit: "count", defaultTarget: 10, xp: 20, active: true, order: data.menus.length + 1 }));
  const open = true;
  const isNew = !data.menus.some((x) => x.id === m.id);
  return (
    <Modal open={open} onClose={onClose} title={isNew ? "メニューを追加" : "メニューを編集"}>
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <Field label="絵文字（追加したメニューに表示）"><input className="input text-center text-2xl" value={m.icon} onChange={(e) => setM({ ...m, icon: e.target.value })} /></Field>
        <Field label="名前"><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="例：ティー打撃" /></Field>
      </div>
      <Field label="種類（育成ステータスに関係）"><select className="input" value={m.category} onChange={(e) => setM({ ...m, category: e.target.value as MenuCategory })}>{CATS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}</select></Field>
      <Field label="単位"><Segmented value={m.unit} options={[{ v: "count", label: "回数" }, { v: "min", label: "分" }]} onChange={(v) => setM({ ...m, unit: v })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="目安"><input className="input" type="number" inputMode="numeric" value={m.defaultTarget} onChange={(e) => setM({ ...m, defaultTarget: Math.max(1, +e.target.value) })} /></Field>
        <Field label="XP"><input className="input" type="number" inputMode="numeric" value={m.xp} onChange={(e) => setM({ ...m, xp: Math.max(0, +e.target.value) })} /></Field>
      </div>
      <div className="flex gap-2">
        {!isNew && !m.builtin && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm("このメニューを消しますか？（過去の記録は残ります）")) { updateData((d) => ({ ...d, menus: d.menus.filter((x) => x.id !== m.id) })); onClose(); } }}>消す</button>}
        <button className="btn btn-primary flex-1" disabled={!m.name.trim()} onClick={() => { updateData((d) => ({ ...d, menus: isNew ? [...d.menus, m] : d.menus.map((x) => (x.id === m.id ? m : x)) })); onClose(); }}>保存</button>
      </div>
    </Modal>
  );
}

function SettingsTab() {
  const data = useAppData();
  const r = data.settings.xpRules;
  const setR = (p: Partial<typeof r>) => updateData((d) => ({ ...d, settings: { ...d.settings, xpRules: { ...d.settings.xpRules, ...p } } }));
  const [pin, setPin] = useState("");
  return (
    <div>
      <Card>
        <div className="font-display text-base mb-2">⚙️ XP のルール</div>
        <p className="text-[11px] text-muted mb-3">各ミッションのXPは「メニュー」タブで。ここはそれ以外。</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="クイズ 1問正解"><input className="input" type="number" inputMode="numeric" value={r.quizEach} onChange={(e) => setR({ quizEach: Math.max(0, +e.target.value) })} /></Field>
          <Field label="クイズ 全問正解ボーナス"><input className="input" type="number" inputMode="numeric" value={r.quizPerfect} onChange={(e) => setR({ quizPerfect: Math.max(0, +e.target.value) })} /></Field>
          <Field label="週間目標 達成XP"><input className="input" type="number" inputMode="numeric" value={r.weeklyGoal} onChange={(e) => setR({ weeklyGoal: Math.max(0, +e.target.value) })} /></Field>
          <Field label="週間目標：週に何日練習"><input className="input" type="number" inputMode="numeric" min={1} max={7} value={r.weeklyGoalDays} onChange={(e) => setR({ weeklyGoalDays: Math.min(7, Math.max(1, +e.target.value)) })} /></Field>
          <Field label="試合を記録"><input className="input" type="number" inputMode="numeric" value={r.gameRecord} onChange={(e) => setR({ gameRecord: Math.max(0, +e.target.value) })} /></Field>
          <Field label="ロードマップの目標達成"><input className="input" type="number" inputMode="numeric" value={r.goalAchieved} onChange={(e) => setR({ goalAchieved: Math.max(0, +e.target.value) })} /></Field>
        </div>
        <p className="text-[11px] text-muted">レベルアップに必要なXP：Lv.1→2 は100、以降レベルごとに +25。</p>
      </Card>
      <Card className="mt-3">
        <div className="font-display text-base mb-2">👨 保護者の表示名</div>
        <input className="input" value={data.settings.parentName} onChange={(e) => updateData((d) => ({ ...d, settings: { ...d.settings, parentName: e.target.value || "パパ" } }))} />
      </Card>
      <Card className="mt-3">
        <div className="font-display text-base mb-2">🔑 PIN を変える</div>
        <div className="flex gap-2">
          <input className="input" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="新しい4けた" />
          <button className="btn btn-blue btn-sm" disabled={!/^\d{4}$/.test(pin)} onClick={() => { updateData((d) => ({ ...d, settings: { ...d.settings, parentPin: pin } })); setPin(""); alert("PINを変えました"); }}>変更</button>
        </div>
      </Card>
    </div>
  );
}

function DataTab() {
  const data = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const exportJson = () => {
    flushSave();
    const d = getData();
    const blob = new Blob([JSON.stringify(d, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shoya-road-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importJson = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text()) as Partial<AppData>;
      if (!raw || typeof raw !== "object" || !Array.isArray(raw.records)) { alert("奨也の道のバックアップファイルではないようです"); return; }
      if (!confirm(`読み込むと、今の記録はこのファイルの内容に置きかわります。\n（練習 ${raw.records.length} 件、試合 ${raw.games?.length || 0} 件）\nよろしいですか？`)) return;
      replaceData(raw as AppData);
      alert("読み込みました");
    } catch { alert("読み込めませんでした"); }
  };
  const size = (() => { try { return Math.round((localStorage.getItem("shoya.road.v1")?.length || 0) / 1024); } catch { return 0; } })();
  return (
    <div>
      <Card>
        <div className="font-display text-base mb-1">💾 バックアップ</div>
        <p className="text-[11px] text-muted mb-3">記録はこの端末の中（ブラウザ）にだけ保存されています。ときどき書き出して iCloud Drive などに保存してください。写真・動画はバックアップに含まれません。</p>
        <div className="text-xs mb-3">記録の大きさ：約 {size} KB／練習 {data.records.length} 件／試合 {data.games.length} 件／写真・動画 {data.media.length} 件</div>
        <div className="flex gap-2">
          <button className="btn btn-blue flex-1" onClick={exportJson}>⬇️ 書き出す</button>
          <button className="btn btn-ghost flex-1" onClick={() => fileRef.current?.click()}>⬆️ 読み込む</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
        </div>
      </Card>
      <Card className="mt-3">
        <div className="font-display text-base mb-1">☁️ 端末どうしの同期</div>
        <p className="text-xs text-white/80">iPhone と iPad で同じ記録を見る自動同期（Supabase）は <span className="chip chip-gold">準備中</span>。それまでは「書き出す → もう一方で読み込む」で合わせられます。</p>
      </Card>
      <Card className="mt-3 border-red-400/40">
        <div className="font-display text-base mb-1 text-red-300">🗑️ 全部消す</div>
        <p className="text-[11px] text-muted mb-2">記録・写真・動画・設定をすべて消して最初の状態に戻します。もどせません。先に書き出しておいてください。</p>
        <button className="btn btn-danger w-full" disabled={!!busy} onClick={async () => {
          if (!confirm("本当にすべて消しますか？")) return;
          if (prompt("確認のため「けす」と入力してください") !== "けす") return;
          setBusy("消しています…");
          await clearBlobs().catch(() => undefined);
          resetData();
          try { sessionStorage.removeItem("shoya.parent"); } catch { /* ignore */ }
          setBusy("");
          alert("消しました");
          location.href = (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/";
        }}>{busy || "すべて消す"}</button>
      </Card>
    </div>
  );
}
