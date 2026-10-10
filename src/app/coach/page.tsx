"use client";
// コーチのアドバイス：記録から選ぶ「きょうの3つ」＋スキル別の一覧＋パパと相談するリスト
import { useState } from "react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { pickToday } from "@/lib/coach";
import { CAT_ICON, CAT_LABEL, TIPS, type CoachCat, type Tip } from "@/data/coach";
import { IMG } from "@/lib/img";
import { nowISO, uid, formatJa } from "@/lib/date";
import { pushCelebrate } from "@/lib/celebrate";

const CATS = Object.keys(CAT_LABEL) as CoachCat[];

export default function CoachPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [cat, setCat] = useState<CoachCat>("batting");
  const [text, setText] = useState("");
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  const todays = pickToday(data);
  const consults = [...(data.consults || [])].sort((a, b) => (a.doneAt ? 1 : 0) - (b.doneAt ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
  const open = consults.filter((c) => !c.doneAt).length;

  const addConsult = (t: string, tipId?: string) => {
    const txt = t.trim();
    if (!txt) return;
    if (tipId && (data.consults || []).some((c) => c.tipId === tipId && !c.doneAt)) { pushCelebrate({ type: "text", text: "もう相談リストに入っています", icon: "👨" }); return; }
    updateData((d) => ({ ...d, consults: [...(d.consults || []), { id: uid("cs"), text: txt, tipId, createdAt: nowISO() }] }));
    pushCelebrate({ type: "text", text: "パパと相談するリストに入れました", icon: "👨" });
  };

  return (
    <div>
      <PageHeader title="コーチのアドバイス" sub="プロ野球コーチの目線で。最後はパパと相談" back="/home" />
      <div className="px-4">
        <Card className="flex items-center gap-3 !bg-none !bg-blue/15 border-blue/40">
          <img src={IMG.hero.think} alt="" className="w-14 h-14 object-contain shrink-0" />
          <p className="text-xs text-white/85 leading-relaxed">ここに書いてあるのは、プロ野球のコーチが大事にしている考え方をもとにした<b>目安</b>。体や作戦のことは人によってちがうから、<b>最後はパパ・監督・コーチと相談して決めよう</b>。</p>
        </Card>

        <div className="font-display text-lg mt-5 mb-2 px-1">🎓 きょうのアドバイス <span className="text-xs text-muted font-sans">{formatJa(new Date().toISOString().slice(0, 10))}</span></div>
        <div className="flex flex-col gap-2">
          {todays.map(({ tip, reason }) => <TipCard key={tip.id} tip={tip} reason={reason} onConsult={() => addConsult(`${tip.title}：${tip.ask}`, tip.id)} />)}
        </div>

        <div className="font-display text-lg mt-6 mb-2 px-1">📚 スキル別のアドバイス</div>
        <div className="scroll-x flex gap-2 pb-1">
          {CATS.map((c) => <button key={c} className={`chip !px-3 !py-2 !text-sm shrink-0 ${cat === c ? "chip-lime" : ""}`} onClick={() => setCat(c)}>{CAT_ICON[c]} {CAT_LABEL[c]}</button>)}
        </div>
        <div className="flex flex-col gap-2 mt-2">
          {TIPS.filter((t) => t.cat === cat).map((t) => <TipCard key={t.id} tip={t} collapsed onConsult={() => addConsult(`${t.title}：${t.ask}`, t.id)} />)}
        </div>

        <div className="font-display text-lg mt-6 mb-2 px-1">👨 パパと相談すること {open > 0 && <span className="chip chip-gold">{open}</span>}</div>
        <Card>
          <div className="flex gap-2">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="自分で書く（例：バットを買いかえたい）" />
            <button className="btn btn-blue btn-sm shrink-0" disabled={!text.trim()} onClick={() => { addConsult(text); setText(""); }}>追加</button>
          </div>
          {consults.length === 0 ? (
            <p className="text-xs text-muted mt-3">アドバイスの「👨 パパと相談する」を押すと、ここにたまる。パパの画面（パパの応援 → 記録）にも出るよ。</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {consults.map((c) => (
                <li key={c.id} className={`flex items-start gap-2 text-sm rounded-xl bg-black/20 px-3 py-2 ${c.doneAt ? "opacity-50" : ""}`}>
                  <span className="shrink-0">{c.doneAt ? "✅" : "💬"}</span>
                  <span className="flex-1 whitespace-pre-wrap">{c.text}</span>
                  <button className="text-muted text-xs shrink-0" onClick={() => updateData((d) => ({ ...d, consults: d.consults.filter((x) => x.id !== c.id) }))}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <Link href="/parent" className="btn btn-ghost btn-sm w-full mt-3">👨 パパの画面を開く</Link>
        </Card>
        <p className="text-[11px] text-muted mt-3 px-1">アドバイスは 全軟連のガイドライン（練習・投球数）とプロのコーチの一般的な考え方をもとに作っています。チームの方針と違うときは、監督・コーチの言うことを優先してね。</p>
      </div>
    </div>
  );
}

function TipCard({ tip, reason, collapsed, onConsult }: { tip: Tip; reason?: string; collapsed?: boolean; onConsult: () => void }) {
  return (
    <details className="card p-0 overflow-hidden" open={!collapsed}>
      <summary className="list-none p-4 cursor-pointer tap">
        {reason && <div className="chip chip-blue mb-1">{reason}</div>}
        <div className="flex items-center gap-2">
          <span className="text-xl">{CAT_ICON[tip.cat]}</span>
          <span className="font-bold flex-1">{tip.title}</span>
          <span className="text-muted text-sm">›</span>
        </div>
      </summary>
      <div className="px-4 pb-4 -mt-1">
        <p className="text-sm text-white/90 leading-relaxed">{tip.body}</p>
        <div className="mt-3 rounded-xl bg-lime/15 px-3 py-2 text-sm"><span className="text-lime font-bold">🎯 今日できる練習：</span>{tip.drill}</div>
        <div className="mt-2 rounded-xl bg-blue/20 px-3 py-2 text-sm"><span className="text-blue-2 font-bold">👨 パパと相談：</span>{tip.ask}</div>
        <button className="btn btn-ghost btn-sm w-full mt-3" onClick={onConsult}>👨 パパと相談するリストに入れる</button>
      </div>
    </details>
  );
}
