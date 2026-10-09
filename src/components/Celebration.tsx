"use client";
// XP 獲得・レベルアップ・メダル・アイテムの演出。画面のどこからでも出る
import { useEffect, useState } from "react";
import { onCelebrate, chime, type CelebrateEvent } from "@/lib/celebrate";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { markSeenOne } from "@/lib/game";
import { ACH_BY_ID } from "@/data/achievements";
import { ITEM_BY_ID, SLOT_LABEL } from "@/data/items";
import { titleForLevel } from "@/lib/level";
import { IMG } from "@/lib/img";

type Big = { kind: "level"; level: number } | { kind: "medal"; id: string } | { kind: "item"; id: string };

export default function Celebration() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [queue, setQueue] = useState<Big[]>([]);

  useEffect(() => {
    let n = 0;
    return onCelebrate((e: CelebrateEvent) => {
      if (e.type === "xp") {
        n += 1;
        const id = n;
        setToasts((t) => [...t, { id, text: `+${e.amount} XP${e.label ? ` ${e.label}` : ""}` }]);
        chime("xp", data.settings.sound);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1400);
      } else if (e.type === "levelup") {
        setQueue((q) => [...q, { kind: "level", level: e.level }]);
      } else if (e.type === "text") {
        n += 1;
        const id = n;
        setToasts((t) => [...t, { id, text: `${e.icon || ""} ${e.text}` }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1600);
      }
    });
  }, [data.settings.sound]);

  // 未表示のメダル・アイテムは data から導く（state に写さない）
  const derived: Big[] = [
    ...data.achievements.filter((a) => !a.seen).map((a) => ({ kind: "medal" as const, id: a.id })),
    ...data.inventory.filter((i) => !i.seen).map((i) => ({ kind: "item" as const, id: i.itemId })),
  ];
  const cur: Big | undefined = queue[0] ?? (hydrated ? derived[0] : undefined);
  const curKey = cur ? (cur.kind === "level" ? `L${cur.level}` : `${cur.kind}:${cur.id}`) : "";
  useEffect(() => {
    if (!curKey) return;
    chime(curKey.startsWith("L") ? "level" : "medal", data.settings.sound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curKey]);

  const next = () => {
    if (!cur) return;
    if (cur.kind === "level") setQueue((q) => q.slice(1));
    else updateData((d) => markSeenOne(d, cur.kind, cur.id));
  };

  return (
    <>
      <div className="fixed top-[calc(env(safe-area-inset-top,0px)+70px)] inset-x-0 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="float-up rounded-full bg-lime text-navy font-display text-lg px-5 py-2 shadow-lg">
            {t.text}
          </div>
        ))}
      </div>
      {cur && <BigCard item={cur} onNext={next} />}
    </>
  );
}

function BigCard({ item, onNext }: { item: Big; onNext: () => void }) {
  const pieces = Array.from({ length: 36 }, (_, i) => i);
  const colors = ["#A8E66C", "#247BDE", "#FFFFFF", "#E8B923", "#4f9bf0"];
  let icon = "⭐", title = "", sub = "", desc = "";
  let visual: React.ReactNode = null;
  if (item.kind === "level") {
    icon = "🆙"; title = "LEVEL UP!"; sub = `Lv.${item.level}  ${titleForLevel(item.level)}`; desc = "レベルが上がった！つぎのアイテムも近い。";
    visual = (
      <div className="relative flex items-center justify-center">
        <img src={IMG.scene.cheer} alt="" className="h-44 w-44 object-cover rounded-3xl border-2 border-lime/70 shadow-xl" />
        <div className="absolute -bottom-1 right-0 font-display text-4xl text-lime drop-shadow-[0_3px_0_rgba(0,0,0,0.5)]">Lv.{item.level}</div>
      </div>
    );
  } else if (item.kind === "medal") {
    const d = ACH_BY_ID[item.id];
    icon = d?.icon || "🏅"; title = d?.tier === "trophy" ? "TROPHY GET!" : "MEDAL GET!"; sub = d?.title || ""; desc = d?.desc || "";
    visual = <MedalImage tier={d?.tier || "bronze"} icon={icon} size={150} />;
  } else {
    const d = ITEM_BY_ID[item.id];
    icon = d?.icon || "🎁"; title = "NEW ITEM!"; sub = d?.name || ""; desc = d ? `${SLOT_LABEL[d.slot]}を手に入れた。${d.desc}` : "";
    visual = <img src={IMG.item(item.id)} alt="" className="w-40 h-40 object-contain drop-shadow-[0_0_24px_rgba(168,230,108,0.6)]" />;
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onNext}>
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti"
          style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${1.8 + (i % 5) * 0.25}s` }}
        />
      ))}
      <div className="card relative overflow-hidden w-full max-w-sm text-center p-6 pt-4 bounce-in">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG.celebrateBg})` }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#13294d]/40 to-[#13294d]" aria-hidden />
        <div className="relative">
        <div className="h-44 flex items-center justify-center mb-1 pop">{visual}</div>
        <div className="font-display text-3xl text-lime tracking-widest">{title}</div>
        <div className="font-display text-xl mt-2">{sub}</div>
        <p className="text-sm text-white/80 mt-2">{desc}</p>
        <button className="btn btn-primary w-full mt-6">OK！</button>
        </div>
      </div>
    </div>
  );
}

/** メダル画像（階級ごと）に絵文字を重ねる */
export function MedalImage({ tier, icon, size = 64, locked }: { tier: string; icon: string; size?: number; locked?: boolean }) {
  const trophy = tier === "trophy";
  const src = trophy ? IMG.trophy : tier === "gold" ? IMG.medal.gold : tier === "silver" ? IMG.medal.silver : IMG.medal.bronze;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size * 1.12 }}>
      <img src={src} alt="" className={`w-full h-full object-contain ${locked ? "grayscale opacity-40" : "drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"}`} draggable={false} />
      <span className="absolute" style={{ fontSize: size * (trophy ? 0.26 : 0.34), top: trophy ? "30%" : "58%", left: "50%", transform: "translate(-50%, -50%)" }}>{locked ? "🔒" : trophy ? "" : icon}</span>
    </div>
  );
}
