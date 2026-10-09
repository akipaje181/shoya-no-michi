"use client";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { Card, MenuIcon, ProgressBar, RankBadge, Stat } from "@/components/ui";
import { useAppData, useHydrated } from "@/lib/store";
import { levelFromXp, totalXp } from "@/lib/level";
import { practiceDays, streak, xpOnDate } from "@/lib/game";
import { today, formatJa, parseISODate } from "@/lib/date";
import { DAILY_CHEERS } from "@/data/defaults";
import { ITEMS } from "@/data/items";
import { IMG } from "@/lib/img";

export default function Home() {
  const data = useAppData();
  const hydrated = useHydrated();
  const t = today();
  const lv = levelFromXp(totalXp(data));
  const doneToday = new Set(data.completions.filter((c) => c.date === t).map((c) => c.menuId));
  const menus = data.menus.filter((m) => m.active).sort((a, b) => a.order - b.order);
  const todaysXp = xpOnDate(data, t);
  const st = streak(data, t);
  const days = practiceDays(data);
  const dayIdx = Math.floor(parseISODate(t).getTime() / 86400000);
  const unreadMsg = [...data.messages].reverse().find((m) => !m.readAt) || [...data.messages].reverse()[0];
  const cheer = DAILY_CHEERS[dayIdx % DAILY_CHEERS.length];
  const nextItem = ITEMS.filter((i) => i.unlockLevel > lv.level).sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
  const restToday = data.restDays.some((r) => r.date === t);

  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-lime text-[10px] tracking-[0.3em]">SHOYA&apos;S ROAD</div>
          <div className="font-display text-xl">{formatJa(t)}</div>
        </div>
        <Link href="/parent" className="chip chip-blue">👨 {data.settings.parentName}</Link>
      </div>

      {/* 選手カード */}
      <div className="card mt-3 relative overflow-hidden p-4" style={{ backgroundImage: `linear-gradient(90deg, rgba(12,28,53,0.25), rgba(12,28,53,0.8)), url(${IMG.homeHero})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="flex items-center gap-3">
          <Link href="/player" className="shrink-0 tap">
            <Avatar data={data} size={120} pose="stand" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl">{data.profile.name}</span>
              {data.profile.number && <span className="font-display text-lime text-xl">#{data.profile.number}</span>}
            </div>
            <div className="mt-1"><RankBadge level={lv.level} /></div>
            <div className="mt-3 flex items-end justify-between">
              <span className="font-display text-2xl">Lv.<span className="text-lime text-3xl">{lv.level}</span></span>
              <span className="text-xs text-muted num">{lv.current} / {lv.need} XP</span>
            </div>
            <ProgressBar value={lv.current} max={lv.need} className="mt-1" />
            <div className="text-[11px] text-muted mt-1">つぎのレベルまで あと <b className="text-white num">{lv.remain}</b> XP</div>
          </div>
        </div>
        {nextItem && (
          <div className="mt-3 text-xs rounded-xl bg-black/25 px-3 py-2 flex items-center gap-2">
            <img src={IMG.item(nextItem.id)} alt="" className="w-8 h-8 object-contain" />
            <span>Lv.<b className="text-lime">{nextItem.unlockLevel}</b> で「{nextItem.name}」をゲット！</span>
          </div>
        )}
      </div>

      {/* 応援メッセージ */}
      <Card className="mt-3 !bg-none !bg-blue/20 border-blue/40 flex items-center gap-3">
        <img src={IMG.papa} alt="" className="w-16 h-16 object-contain shrink-0 -ml-1" draggable={false} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-blue-2 mb-1">💬 {unreadMsg ? `${unreadMsg.from}からの応援` : "きょうの応援"}</div>
          <div className="font-bold leading-snug">{unreadMsg ? unreadMsg.text : cheer}</div>
          {unreadMsg && <div className="text-[10px] text-muted mt-1">{formatJa(unreadMsg.date)}</div>}
        </div>
      </Card>

      {/* 今日のポイント・記録 */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="きょうのXP" value={<span className="text-lime">+{todaysXp}</span>} />
        <Stat label="れんぞく" value={st} unit="日" />
        <Stat label="練習した日" value={days} unit="日" />
      </div>

      {/* 今日のミッション */}
      <div className="flex items-end justify-between mt-5 mb-2 px-1">
        <h2 className="font-display text-lg">🎯 きょうのミッション</h2>
        <span className="text-xs text-muted num">{menus.filter((m) => doneToday.has(m.id)).length} / {menus.length} クリア</span>
      </div>
      {restToday && menus.every((m) => !doneToday.has(m.id)) && (
        <Card className="mb-2 text-sm flex items-center gap-3"><img src={IMG.scene.rest} alt="" className="w-16 h-16 object-cover rounded-xl" /><span>きょうは休養日。体を休めるのも練習のうち！</span></Card>
      )}
      <div className="grid grid-cols-2 gap-2">
        {menus.map((m) => {
          const done = doneToday.has(m.id);
          return (
            <Link key={m.id} href={m.id === "quiz" ? "/quiz" : `/practice?menu=${m.id}`} className={`card p-3 tap flex items-center gap-2 ${done ? "opacity-70 !border-lime/60" : ""}`}>
              <MenuIcon menu={m} size={38} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[13px] leading-tight">{m.name}</div>
                <div className="text-[11px] text-muted">{done ? "✅ クリア！" : `+${m.xp} XP`}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 目標 */}
      <Card className="mt-4">
        <div className="text-[11px] font-bold text-lime mb-1">🏆 今年の目標</div>
        <div className="font-display text-2xl">{data.profile.goalThisYear}</div>
        <div className="text-xs text-muted mt-2">夢：{data.profile.dreamText}</div>
        <Link href="/road" className="btn btn-blue btn-sm mt-3 w-full">夢へのロードマップを見る →</Link>
      </Card>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Link href="/growth" className="card p-3 tap text-center"><div className="text-2xl">📈</div><div className="text-sm font-bold">成長グラフ</div></Link>
        <Link href="/trophies" className="card p-3 tap text-center"><div className="text-2xl">🏅</div><div className="text-sm font-bold">メダル・アイテム</div></Link>
      </div>
    </div>
  );
}
