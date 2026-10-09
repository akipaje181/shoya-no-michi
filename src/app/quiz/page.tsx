"use client";
import { useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { QUIZ_BY_ID, questionsForDate } from "@/data/quiz";
import { answerQuiz } from "@/lib/game";
import { celebrateGain, chime } from "@/lib/celebrate";
import { formatJa, today } from "@/lib/date";

export default function QuizPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const t = today();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  const qs = questionsForDate(t);
  const todays = data.quiz.filter((q) => q.date === t);
  const answered = new Map(todays.map((q) => [q.questionId, q]));
  const allDone = qs.every((q) => answered.has(q.id));
  const cur = qs[Math.min(idx, qs.length - 1)];
  const prev = answered.get(cur.id);
  const shown = picked ?? prev?.choice ?? null;
  const correctCount = qs.filter((q) => answered.get(q.id)?.correct).length;
  const totalCorrect = data.quiz.filter((q) => q.correct).length;

  const choose = (i: number) => {
    if (shown !== null) return;
    setPicked(i);
    const ok = i === cur.answer;
    chime(ok ? "ok" : "ng", data.settings.sound);
    let r: ReturnType<typeof answerQuiz> | null = null;
    updateData((d) => { r = answerQuiz(d, cur.id, i, ok, t); return r.data; });
    if (r) celebrateGain(r, "クイズ");
  };

  const history = [...data.quiz].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);

  return (
    <div>
      <PageHeader title="野球クイズ" sub={`${formatJa(t)}　正解 ${correctCount} / 3`} back="/practice" />
      <div className="px-4">
        <div className="flex gap-1 mb-3">
          {qs.map((q, i) => {
            const a = answered.get(q.id);
            return <button key={q.id} onClick={() => { setIdx(i); setPicked(null); }} className={`flex-1 h-2 rounded-full ${a ? (a.correct ? "bg-lime" : "bg-white/40") : i === idx ? "bg-blue-2" : "bg-white/15"}`} aria-label={`第${i + 1}問`} />;
          })}
        </div>
        <Card>
          <div className="chip chip-blue mb-2">第{idx + 1}問 / 3　{cur.tag === "fielding" ? "守備" : cur.tag === "running" ? "走塁" : cur.tag === "batting" ? "打撃" : "ルール"}</div>
          <div className="font-bold text-lg leading-snug">{cur.q}</div>
          <div className="flex flex-col gap-2 mt-4">
            {cur.choices.map((c, i) => {
              const isAns = i === cur.answer;
              const isPick = shown === i;
              let cls = "btn-ghost";
              if (shown !== null) cls = isAns ? "!bg-lime !text-navy" : isPick ? "!bg-white/20 !text-white/70" : "btn-ghost opacity-60";
              return (
                <button key={i} className={`btn ${cls} justify-start text-left`} onClick={() => choose(i)} disabled={shown !== null}>
                  <span className="w-7 h-7 rounded-full bg-black/25 flex items-center justify-center text-sm shrink-0">{["A", "B", "C", "D"][i]}</span>
                  <span className="flex-1">{c}</span>
                  {shown !== null && isAns && <span>⭕</span>}
                  {shown !== null && isPick && !isAns && <span>…</span>}
                </button>
              );
            })}
          </div>
          {shown !== null && (
            <div className="mt-4 rounded-xl bg-black/25 p-3 fade-in">
              <div className={`font-display text-lg ${shown === cur.answer ? "text-lime" : "text-blue-2"}`}>{shown === cur.answer ? "せいかい！" : "おしい！ 答えは " + ["A", "B", "C", "D"][cur.answer]}</div>
              <div className="text-sm mt-1 text-white/90">{cur.explain}</div>
              {idx < 2 && <button className="btn btn-blue w-full mt-3" onClick={() => { setIdx(idx + 1); setPicked(null); }}>つぎの問題 →</button>}
              {idx === 2 && allDone && (
                <div className="mt-3 text-center font-bold">
                  {correctCount === 3 ? <span className="text-lime font-display text-xl">🎉 全問正解！ +{data.settings.xpRules.quizPerfect} XP</span> : <span>きょうは {correctCount} 問 正解。また明日！</span>}
                </div>
              )}
            </div>
          )}
        </Card>
        <p className="text-[11px] text-muted mt-2 px-1">クイズは1日3問。日付が変わると新しい問題になります。</p>

        <div className="font-display text-lg mt-5 mb-2 px-1">📚 クイズ履歴 <span className="text-xs text-muted font-sans">通算 {totalCorrect} 問 正解</span></div>
        {history.length === 0 ? (
          <Card><div className="text-center text-muted py-4">まだ記録がありません</div></Card>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((h) => (
              <div key={h.id} className="card px-3 py-2 flex items-center gap-2 text-sm">
                <span>{h.correct ? "⭕" : "△"}</span>
                <span className="flex-1 truncate">{QUIZ_BY_ID[h.questionId]?.q || h.questionId}</span>
                <span className="text-[10px] text-muted">{formatJa(h.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
