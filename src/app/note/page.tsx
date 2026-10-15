"use client";
// 野球ノート：きょう練習したこと・コーチに言われたこと・できたこと・つぎの課題
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Empty, Field, Ic, MenuIcon, PageHeader, Segmented } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { markCommentRead, saveNote } from "@/lib/game";
import { celebrateGain, pushCelebrate } from "@/lib/celebrate";
import { addDays, formatJa, nowISO, today, uid } from "@/lib/date";
import type { DiaryNote, Mood } from "@/lib/types";
import { IMG, MOOD_IMG } from "@/lib/img";
import { DayMedia } from "@/components/Media";
import { showLocalNotification } from "@/lib/notify";

const MOODS: { v: Mood; label: string }[] = [{ v: "great", label: "😄 さいこう" }, { v: "good", label: "🙂 いい感じ" }, { v: "soso", label: "😐 ふつう" }, { v: "tough", label: "😣 きつかった" }];
const MOOD_ICON: Record<Mood, string> = { great: "😄", good: "🙂", soso: "😐", tough: "😣" };

export default function NotePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">読み込み中…</div>}>
      <Note />
    </Suspense>
  );
}

function Note() {
  const data = useAppData();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const [date, setDate] = useState<string>(params.get("date") || today());
  const [tab, setTab] = useState<"write" | "list" | "coach">("write");
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  const notes = data.notes || [];
  const filled = (n: DiaryNote) => !!(n.practice.trim() || n.coachWords.length || n.didWell.trim() || n.nextGoal.trim());
  // 写真・動画だけの日も「これまで」に出す
  const mediaDates = new Set(data.media.map((m) => m.date));
  const written = notes.filter((n) => filled(n) || mediaDates.has(n.date)).sort((a, b) => b.date.localeCompare(a.date));
  for (const d of mediaDates) if (!written.some((n) => n.date === d)) written.push({ id: `md-${d}`, date: d, practice: "", coachWords: [], didWell: "", nextGoal: "", createdAt: "", updatedAt: "" });
  written.sort((a, b) => b.date.localeCompare(a.date));
  const coachAll = written.flatMap((n) => n.coachWords.map((w) => ({ date: n.date, w })));
  const mediaCount = (d: string) => data.media.filter((m) => m.date === d).length;

  return (
    <div>
      <PageHeader title="野球ノート" sub={`${written.length} 日分　コーチの言葉 ${coachAll.length}`} back="/home" />
      <div className="px-4">
        <Segmented value={tab} options={[{ v: "write" as const, label: "✏️ 書く" }, { v: "list" as const, label: "📚 これまで" }, { v: "coach" as const, label: "🗣️ コーチの言葉" }]} onChange={setTab} />

        {tab === "write" && <Editor key={date} date={date} onDate={setDate} />}

        {tab === "list" && (
          <div className="mt-3 flex flex-col gap-2">
            {written.length === 0 ? (
              <Card><Empty text="まだノートがありません" sub="「書く」で きょうのことを書こう" /></Card>
            ) : (
              written.map((n) => (
                <Card key={n.id} onClick={() => { setDate(n.date); setTab("write"); }}>
                  <div className="flex items-center justify-between"><b>{formatJa(n.date, true)}</b>{n.mood && <Ic name={MOOD_IMG[n.mood]} emoji={MOOD_ICON[n.mood]} size={30} />}</div>
                  {n.practice && <div className="text-sm mt-1 line-clamp-2">🏃 {n.practice}</div>}
                  {mediaCount(n.date) > 0 && <div className="text-xs mt-1 text-muted">📷🎬 写真・動画 {mediaCount(n.date)} 件</div>}
                  {n.coachWords.length > 0 && <div className="text-sm mt-1 text-lime line-clamp-2">🗣️ {n.coachWords.join(" ／ ")}</div>}
                  {n.nextGoal && <div className="text-xs mt-1 text-muted">🎯 {n.nextGoal}</div>}
                  {n.parentComment && <div className="text-xs mt-1 text-blue-2">👨 {n.parentComment}</div>}
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "coach" && <CoachWords items={coachAll} onOpen={(d) => { setDate(d); setTab("write"); }} />}
      </div>
    </div>
  );
}

function Editor({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  const data = useAppData();
  const existing = (data.notes || []).find((n) => n.date === date);
  const [practice, setPractice] = useState(existing?.practice || "");
  const [words, setWords] = useState<string[]>(existing?.coachWords || []);
  const [word, setWord] = useState("");
  const [didWell, setDidWell] = useState(existing?.didWell || "");
  const [nextGoal, setNextGoal] = useState(existing?.nextGoal || "");
  const [mood, setMood] = useState<Mood | undefined>(existing?.mood);
  const t = today();
  const isFuture = date > t;

  // その日の記録（自動）
  const recs = data.records.filter((r) => r.date === date);
  const menuOf = (id: string) => data.menus.find((m) => m.id === id);
  const game = data.games.find((g) => g.date === date);
  const events = data.events.filter((e) => e.date === date);
  const xpDone = data.xp.some((x) => x.uniqueKey === `note:${date}`);
  // お父さんのひとことを開いたら既読にする（ホームのお知らせが消える）
  const commentUnread = !!existing?.parentComment && !!existing.parentCommentAt && (!existing.commentReadAt || existing.commentReadAt < existing.parentCommentAt);
  useEffect(() => {
    if (commentUnread) updateData((d) => markCommentRead(d, date));
  }, [commentUnread, date]);

  const addWord = () => {
    const w = word.trim();
    if (!w) return;
    setWords([...words, w]); setWord("");
  };
  const save = () => {
    if (word.trim()) { addWord(); }
    const finalWords = word.trim() ? [...words, word.trim()] : words;
    const note: DiaryNote = { id: existing?.id || uid("nt"), date, practice: practice.trim(), coachWords: finalWords, didWell: didWell.trim(), nextGoal: nextGoal.trim(), mood, parentComment: existing?.parentComment, createdAt: existing?.createdAt || nowISO(), updatedAt: nowISO() };
    let r: ReturnType<typeof saveNote> | null = null;
    updateData((d) => { r = saveNote(d, note); return r.data; });
    if (r && (r as ReturnType<typeof saveNote>).xpGained > 0) celebrateGain(r, "野球ノート");
    if (practice.trim() || finalWords.length || didWell.trim() || nextGoal.trim()) void showLocalNotification(`📓 ${data.profile.name}がノートを書きました`, `${formatJa(date)}：${practice.trim() || finalWords[0] || didWell.trim() || nextGoal.trim()}`, "/parent/");
    else pushCelebrate({ type: "text", text: "ノートを保存しました", icon: "📓" });
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <button className="btn btn-ghost btn-sm" onClick={() => onDate(addDays(date, -1))}>◀</button>
        <div className="text-center">
          <div className="font-display text-lg">{formatJa(date, true)}</div>
          <div className="text-[11px] text-muted">{date === t ? "きょう" : date === addDays(t, -1) ? "きのう" : ""}{xpDone ? "　✅ XP 受け取り済み" : ""}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onDate(addDays(date, 1))} disabled={date >= t}>▶</button>
      </div>
      <input className="input mt-2 !min-h-10 text-center" type="date" value={date} max={t} onChange={(e) => e.target.value && onDate(e.target.value)} />

      {(recs.length > 0 || game || events.length > 0) && (
        <Card className="mt-3">
          <div className="text-[11px] font-bold text-lime mb-1 flex items-center gap-1"><Ic name="note-auto" emoji="📋" size={20} /> この日の記録（自動）</div>
          <div className="flex flex-wrap gap-1">
            {events.map((e) => <span key={e.id} className="chip chip-blue">📅 {e.title}</span>)}
            {recs.map((r) => { const m = menuOf(r.menuId); return <span key={r.id} className="chip inline-flex items-center gap-1">{m ? <MenuIcon menu={m} size={16} /> : "📝"}{m?.name} {r.amount}{m?.unit === "min" ? "分" : "回"}</span>; })}
            {game && <span className="chip chip-gold">⚾ vs {game.opponent} {game.ab}打数{game.hits}安打</span>}
          </div>
        </Card>
      )}

      {isFuture ? (
        <Card className="mt-3"><div className="text-center text-muted py-3 text-sm">未来の日付には書けません</div></Card>
      ) : (
        <Card className="mt-3">
          <Field label={<><Ic name="event-practice" emoji="🏃" size={22} /> きょう練習したこと（チーム練習・自主練・試合）</>}>
            <textarea className="input" value={practice} onChange={(e) => setPractice(e.target.value)} placeholder="例：チーム練習。ノック、ティー打撃、紅白戦で2打席" />
          </Field>
          <Field label={<><Ic name="note-coach" emoji="🗣️" size={22} /> 監督・コーチに言われたこと（1つずつ追加）</>} hint="あとで「コーチの言葉」タブでまとめて見返せる">
            <div className="flex gap-2">
              <input className="input" value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWord(); } }} placeholder="例：ゴロは正面に入る" />
              <button type="button" className="btn btn-blue btn-sm shrink-0" onClick={addWord} disabled={!word.trim()}>追加</button>
            </div>
            {words.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {words.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-lime/10 px-3 py-2 text-sm">
                    <span className="text-lime shrink-0">🗣️</span><span className="flex-1">{w}</span>
                    <button type="button" className="text-muted text-xs" onClick={() => setWords(words.filter((_, j) => j !== i))}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <Field label={<><Ic name="note-didwell" emoji="👍" size={22} /> できたこと</>}><input className="input" value={didWell} onChange={(e) => setDidWell(e.target.value)} placeholder="例：ゴロを1回もトンネルしなかった" /></Field>
          <Field label={<><Ic name="tab-mission" emoji="🎯" size={22} /> つぎの課題</>}><input className="input" value={nextGoal} onChange={(e) => setNextGoal(e.target.value)} placeholder="例：送球を胸に投げる" /></Field>
          <DayMedia date={date} />
          <Field label="きょうの気分">
            <Segmented value={mood || ("" as Mood)} options={MOODS.map((m) => ({ v: m.v, label: <span className="flex flex-col items-center gap-0.5"><Ic name={MOOD_IMG[m.v]} emoji={m.label.slice(0, 2).trim()} size={34} /><span className="text-[11px]">{m.label.slice(2).trim()}</span></span> }))} onChange={(v) => setMood(v)} />
          </Field>
          {existing?.parentComment && (
            <div className="rounded-xl bg-blue/20 px-3 py-2 text-sm mb-3 flex items-center gap-2"><img src={IMG.papa} alt="" className="w-8 h-8 object-contain" /><span><b className="text-blue-2">{data.settings.parentName}のひとこと：</b>{existing.parentComment}{existing.parentCommentAt && <span className="text-[10px] text-muted ml-1">{formatJa(existing.parentCommentAt.slice(0, 10))}</span>}</span></div>
          )}
          <button className="btn btn-primary w-full text-lg" onClick={save}>{xpDone ? "📓 ノートを保存" : `📓 保存して +${data.settings.xpRules.note} XP`}</button>
          <p className="text-[11px] text-muted mt-2">何も書かなくても大丈夫。1行でも書くと、あとで宝物になる。</p>
        </Card>
      )}
    </div>
  );
}

function CoachWords({ items, onOpen }: { items: { date: string; w: string }[]; onOpen: (d: string) => void }) {
  const [q, setQ] = useState("");
  const list = items.filter((x) => !q.trim() || x.w.includes(q.trim()));
  return (
    <div className="mt-3">
      <input className="input" placeholder="🔍 さがす（例：正面、ひじ）" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? (
        <Card className="mt-3"><Empty text={q ? "見つかりませんでした" : "まだありません"} sub="ノートの「コーチに言われたこと」に書くと、ここにたまる" /></Card>
      ) : (
        <div className="mt-3 flex flex-col gap-1">
          {list.map((x, i) => (
            <button key={i} className="card px-3 py-2 text-left flex items-start gap-2 tap" onClick={() => onOpen(x.date)}>
              <span className="text-lime shrink-0">🗣️</span>
              <span className="flex-1 text-sm">{x.w}</span>
              <span className="text-[10px] text-muted shrink-0">{formatJa(x.date)}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted mt-3 px-1">試合の前に読み返すと、言われたことを思い出せる。プロもノートを見返している。</p>
    </div>
  );
}
