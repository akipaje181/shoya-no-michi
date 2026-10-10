"use client";
// ルールブック：読んだ項目に「読んだ」をつけられる
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, PageHeader, ProgressBar } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { RULE_COUNT, RULE_SECTIONS } from "@/data/rules";
import { settle } from "@/lib/game";
import { pushCelebrate } from "@/lib/celebrate";

export default function RulesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">読み込み中…</div>}>
      <Rules />
    </Suspense>
  );
}

function Rules() {
  const data = useAppData();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const [open, setOpen] = useState<string>(params.get("section") || "basic");
  const [q, setQ] = useState("");
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  const read = new Set(data.rulesRead || []);
  const query = q.trim();
  const sections = query
    ? RULE_SECTIONS.map((s) => ({ ...s, rules: s.rules.filter((r) => (r.title + r.body + (r.point || "")).includes(query)) })).filter((s) => s.rules.length > 0)
    : RULE_SECTIONS;

  const toggleRead = (id: string) => {
    updateData((d) => {
      const has = (d.rulesRead || []).includes(id);
      const next = { ...d, rulesRead: has ? d.rulesRead.filter((x) => x !== id) : [...(d.rulesRead || []), id] };
      return settle(next).data;
    });
    if (!read.has(id) && read.size + 1 === 10) pushCelebrate({ type: "text", text: "10項目 読んだ！", icon: "📖" });
  };

  return (
    <div>
      <PageHeader title="ルールブック" sub={`${RULE_COUNT} 項目　読んだ ${read.size}`} back="/more" right={<Link href="/quiz" className="btn btn-ghost btn-sm">❓ クイズ</Link>} />
      <div className="px-4">
        <Card>
          <div className="flex items-center justify-between text-xs mb-1"><span className="font-bold">📖 読んだ項目</span><span className="num text-muted">{read.size} / {RULE_COUNT}</span></div>
          <ProgressBar value={read.size} max={RULE_COUNT} />
          <p className="text-[11px] text-muted mt-2">読んで「わかった」と思ったら ✓ を押そう。10項目でメダル。</p>
        </Card>
        <input className="input mt-3" placeholder="🔍 さがす（例：タッチアップ、ボーク）" value={q} onChange={(e) => setQ(e.target.value)} />

        {!query && (
          <div className="scroll-x flex gap-2 mt-3 pb-1">
            {RULE_SECTIONS.map((s) => (
              <button key={s.id} className={`chip !px-3 !py-2 !text-sm shrink-0 ${open === s.id ? "chip-lime" : ""}`} onClick={() => setOpen(s.id)}>{s.icon} {s.title}</button>
            ))}
          </div>
        )}

        {sections.filter((s) => query || s.id === open).map((s) => (
          <div key={s.id} className="mt-3">
            <div className="font-display text-lg px-1">{s.icon} {s.title}</div>
            <p className="text-xs text-muted px-1 mb-2">{s.intro}</p>
            <div className="flex flex-col gap-2">
              {s.rules.map((r) => {
                const done = read.has(r.id);
                return (
                  <details key={r.id} className={`card p-0 overflow-hidden ${done ? "!border-lime/40" : ""}`}>
                    <summary className="list-none p-3 flex items-center gap-3 cursor-pointer tap">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${done ? "bg-lime text-navy" : "bg-black/25 text-muted"}`}>{done ? "✓" : "📖"}</span>
                      <span className="font-bold flex-1">{r.title}</span>
                      <span className="text-muted text-sm">›</span>
                    </summary>
                    <div className="px-4 pb-4 -mt-1">
                      <p className="text-sm text-white/90 leading-relaxed">{r.body}</p>
                      {r.point && <div className="mt-2 rounded-xl bg-lime/15 text-lime text-sm px-3 py-2">💡 {r.point}</div>}
                      <button className={`btn btn-sm w-full mt-3 ${done ? "btn-ghost" : "btn-primary"}`} onClick={() => toggleRead(r.id)}>{done ? "✓ 読んだ（もどす）" : "わかった！ ✓ 読んだ にする"}</button>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        ))}
        {query && sections.length === 0 && <Card className="mt-3"><div className="text-center text-muted py-3 text-sm">「{query}」は見つかりませんでした</div></Card>}
        <p className="text-[11px] text-muted mt-4 px-1">大会によってルールが少し違うことがあります（イニング数・リード・投球数など）。わからないときはコーチに聞こう。</p>
      </div>
    </div>
  );
}
