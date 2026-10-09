"use client";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Empty, PageHeader, Segmented } from "@/components/ui";
import { useAppData, useHydrated } from "@/lib/store";
import { addDays, today } from "@/lib/date";
import { IMG } from "@/lib/img";

type Range = "7" | "30" | "90" | "365";
type Metric = "swing" | "minutes" | "days" | "catch" | "throw" | "run20" | "hits" | "steals";

const METRICS: { v: Metric; label: string; unit: string; kind: "bar" | "line" | "area" }[] = [
  { v: "swing", label: "素振り回数", unit: "回", kind: "bar" },
  { v: "minutes", label: "練習時間", unit: "分", kind: "bar" },
  { v: "days", label: "練習日数", unit: "日", kind: "area" },
  { v: "catch", label: "捕球成功率", unit: "%", kind: "line" },
  { v: "throw", label: "送球成功率", unit: "%", kind: "line" },
  { v: "run20", label: "20m走タイム", unit: "秒", kind: "line" },
  { v: "hits", label: "試合の安打数", unit: "本", kind: "bar" },
  { v: "steals", label: "盗塁数", unit: "回", kind: "bar" },
];

export default function GrowthPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [range, setRange] = useState<Range>("30");
  const [metric, setMetric] = useState<Metric>("swing");
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  const days = Number(range);
  const t = today();
  const from = addDays(t, -(days - 1));
  const def = METRICS.find((m) => m.v === metric)!;
  // 期間をいくつかに区切る（7日→1日ごと、30日→1日ごと、90日→週ごと、365日→月ごと）
  const bucket = days <= 30 ? "day" : days <= 90 ? "week" : "month";
  const keyOf = (d: string) => (bucket === "day" ? d : bucket === "week" ? addDays(d, -((new Date(d).getDay() + 6) % 7)) : d.slice(0, 7));
  const labelOf = (k: string) => (bucket === "month" ? `${Number(k.slice(5))}月` : `${Number(k.slice(5, 7))}/${Number(k.slice(8))}`);

  const buckets: string[] = [];
  if (bucket === "day") for (let d = from; d <= t; d = addDays(d, 1)) buckets.push(d);
  else if (bucket === "week") for (let d = keyOf(from); d <= t; d = addDays(d, 7)) buckets.push(d);
  else { const s = new Set<string>(); for (let d = from; d <= t; d = addDays(d, 1)) s.add(d.slice(0, 7)); buckets.push(...s); }

  const recs = data.records.filter((r) => r.date >= from && r.date <= t);
  const games = data.games.filter((g) => g.date >= from && g.date <= t);
  const menuUnit = (id: string) => data.menus.find((m) => m.id === id)?.unit;

  let hasData = false;
  const rows = buckets.map((b) => {
    const rs = recs.filter((r) => keyOf(r.date) === b);
    const gs = games.filter((g) => keyOf(g.date) === b);
    let v: number | null = null;
    switch (metric) {
      case "swing": v = rs.filter((r) => r.menuId === "swing").reduce((s, r) => s + r.amount, 0); break;
      case "minutes": v = rs.filter((r) => menuUnit(r.menuId) === "min").reduce((s, r) => s + r.amount, 0); break;
      case "days": v = new Set(rs.map((r) => r.date)).size; break;
      case "catch": { const tr = rs.reduce((s, r) => s + (r.measured?.catchTry || 0), 0); const ok = rs.reduce((s, r) => s + (r.measured?.catchOk || 0), 0); v = tr ? Math.round((ok / tr) * 100) : null; break; }
      case "throw": { const tr = rs.reduce((s, r) => s + (r.measured?.throwTry || 0), 0); const ok = rs.reduce((s, r) => s + (r.measured?.throwOk || 0), 0); v = tr ? Math.round((ok / tr) * 100) : null; break; }
      case "run20": { const xs = rs.map((r) => r.measured?.run20m).filter((x): x is number => !!x); v = xs.length ? Math.min(...xs) : null; break; }
      case "hits": v = gs.length ? gs.reduce((s, g) => s + g.hits, 0) : null; break;
      case "steals": v = gs.length ? gs.reduce((s, g) => s + g.steals, 0) : null; break;
    }
    if (v !== null && (metric === "catch" || metric === "throw" || metric === "run20" || metric === "hits" || metric === "steals" ? true : v > 0)) hasData = true;
    return { k: labelOf(b), v };
  });

  const total = rows.reduce((s, r) => s + (r.v || 0), 0);
  const summary =
    metric === "run20" ? (hasData ? `ベスト ${Math.min(...rows.map((r) => r.v ?? 999)).toFixed(2)} 秒` : "")
    : metric === "catch" || metric === "throw" ? (hasData ? `平均 ${Math.round(rows.filter((r) => r.v !== null).reduce((s, r) => s + (r.v || 0), 0) / rows.filter((r) => r.v !== null).length)}%` : "")
    : `合計 ${total} ${def.unit}`;

  return (
    <div>
      <PageHeader title="成長グラフ" sub="数字で見る、奨也の道" banner={IMG.banner("growth")} />
      <div className="px-4">
        <Segmented value={range} options={[{ v: "7", label: "7日" }, { v: "30", label: "30日" }, { v: "90", label: "3か月" }, { v: "365", label: "1年" }]} onChange={setRange} />
        <div className="scroll-x flex gap-2 mt-3 pb-1">
          {METRICS.map((m) => (
            <button key={m.v} className={`chip !px-3 !py-2 !text-sm shrink-0 ${metric === m.v ? "chip-lime" : ""}`} onClick={() => setMetric(m.v)}>{m.label}</button>
          ))}
        </div>
        <Card className="mt-3">
          <div className="flex items-end justify-between mb-2">
            <div className="font-display text-lg">{def.label}</div>
            {hasData && <div className="text-sm text-lime font-bold num">{summary}</div>}
          </div>
          {!hasData ? (
            <Empty text="まだ記録がありません" sub={metric === "catch" || metric === "throw" || metric === "run20" ? "ミッションの「実測を入れる」で記録できます" : metric === "hits" || metric === "steals" ? "試合記録から集計します" : "ミッションをクリアすると増えていきます"} />
          ) : (
            <div className="h-[260px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                {def.kind === "bar" ? (
                  <BarChart data={rows}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="k" tick={{ fill: "#9fb3d6", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#9fb3d6", fontSize: 10 }} width={34} />
                    <Tooltip contentStyle={{ background: "#13294d", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} formatter={(v) => [`${v} ${def.unit}`, def.label]} />
                    <Bar dataKey="v" fill="#A8E66C" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                ) : def.kind === "area" ? (
                  <AreaChart data={rows}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="k" tick={{ fill: "#9fb3d6", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#9fb3d6", fontSize: 10 }} width={34} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#13294d", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} formatter={(v) => [`${v} ${def.unit}`, def.label]} />
                    <Area dataKey="v" stroke="#4f9bf0" fill="#247BDE" fillOpacity={0.5} isAnimationActive={false} />
                  </AreaChart>
                ) : (
                  <LineChart data={rows}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="k" tick={{ fill: "#9fb3d6", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#9fb3d6", fontSize: 10 }} width={34} domain={metric === "run20" ? ["auto", "auto"] : [0, 100]} reversed={false} />
                    <Tooltip contentStyle={{ background: "#13294d", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} formatter={(v) => [`${v} ${def.unit}`, def.label]} />
                    <Line dataKey="v" stroke="#A8E66C" strokeWidth={3} dot={{ fill: "#A8E66C", r: 4 }} connectNulls isAnimationActive={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <p className="text-[11px] text-muted mt-2 px-1">{bucket === "day" ? "1日ごと" : bucket === "week" ? "週ごと（月曜はじまり）" : "月ごと"}の集計。20m走はその期間のベストタイム。</p>
      </div>
    </div>
  );
}
