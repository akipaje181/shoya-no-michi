"use client";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";

const LINKS = [
  { href: "/games", icon: "🏟️", label: "試合記録", sub: "試合ごとの成績と通算成績" },
  { href: "/growth", icon: "📈", label: "成長グラフ", sub: "素振り・練習時間・成功率・タイム" },
  { href: "/trophies", icon: "🏅", label: "メダル・アイテム", sub: "集めたメダルと装備" },
  { href: "/quiz", icon: "❓", label: "野球クイズ", sub: "1日3問。ルールを覚えよう" },
  { href: "/album", icon: "🎬", label: "動画アルバム", sub: "バッティング動画・思い出の写真" },
  { href: "/practice/history", icon: "📅", label: "練習の履歴", sub: "カレンダーで見る" },
  { href: "/parent", icon: "👨", label: "パパの応援", sub: "保護者用（応援メッセージ・設定）" },
];

export default function MorePage() {
  const data = useAppData();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  return (
    <div>
      <PageHeader title="メニュー" />
      <div className="px-4 flex flex-col gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="card p-4 tap flex items-center gap-3">
            <span className="text-2xl w-10 text-center">{l.icon}</span>
            <div className="flex-1"><div className="font-bold">{l.label}</div><div className="text-xs text-muted">{l.sub}</div></div>
            <span className="text-muted">›</span>
          </Link>
        ))}
        <Card className="mt-2">
          <div className="font-display text-base mb-2">⚙️ 設定</div>
          <label className="flex items-center justify-between py-2">
            <span className="font-bold text-sm">効果音</span>
            <button className={`w-14 h-8 rounded-full relative transition ${data.settings.sound ? "bg-lime" : "bg-white/20"}`} onClick={() => updateData((d) => ({ ...d, settings: { ...d.settings, sound: !d.settings.sound } }))} aria-label="効果音">
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition ${data.settings.sound ? "left-7" : "left-1"}`} />
            </button>
          </label>
          <Link href="/" className="btn btn-ghost btn-sm w-full mt-2" onClick={() => { try { sessionStorage.removeItem("shoya.opened"); } catch { /* ignore */ } }}>▶ オープニングをもう一度見る</Link>
        </Card>
        <Card>
          <div className="font-display text-base mb-2">📖 つかいかた</div>
          <ul className="text-sm text-white/85 list-disc pl-5 space-y-1">
            <li>毎日「ミッション」で練習を記録すると XP がもらえてレベルが上がる</li>
            <li>レベルが上がると新しいバットやグローブが手に入る（メダル・アイテム）</li>
            <li>試合のあとは「試合記録」に打席の結果を入れる</li>
            <li>記録は この端末の中に保存される。「パパの応援 → バックアップ」で書き出せる</li>
            <li>iPhone のホーム画面に追加すると、アプリのように開ける（共有 → ホーム画面に追加）</li>
          </ul>
          <div className="text-[11px] text-muted mt-3">奨也の道 SHOYA&apos;S ROAD v0.1 — 記録は端末内のみ。外部には送信しません。</div>
        </Card>
      </div>
    </div>
  );
}
