"use client";
// XP 獲得・レベルアップ・メダル・アイテムの演出。画面のどこからでも出る
import { useEffect, useState } from "react";
import { onCelebrate, chime, type CelebrateEvent } from "@/lib/celebrate";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { markSeenOne } from "@/lib/game";
import { ACH_BY_ID } from "@/data/achievements";
import { ITEM_BY_ID, SLOT_LABEL } from "@/data/items";
import { titleForLevel } from "@/lib/level";

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
  if (item.kind === "level") {
    icon = "🆙"; title = "LEVEL UP!"; sub = `Lv.${item.level}  ${titleForLevel(item.level)}`; desc = "レベルが上がった！つぎのアイテムも近い。";
  } else if (item.kind === "medal") {
    const d = ACH_BY_ID[item.id];
    icon = d?.icon || "🏅"; title = d?.tier === "trophy" ? "TROPHY GET!" : "MEDAL GET!"; sub = d?.title || ""; desc = d?.desc || "";
  } else {
    const d = ITEM_BY_ID[item.id];
    icon = d?.icon || "🎁"; title = "NEW ITEM!"; sub = d?.name || ""; desc = d ? `${SLOT_LABEL[d.slot]}を手に入れた。${d.desc}` : "";
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
      <div className="card relative overflow-hidden w-full max-w-sm text-center p-8 bounce-in shine">
        <div className="text-7xl mb-2 pop">{icon}</div>
        <div className="font-display text-3xl text-lime tracking-widest">{title}</div>
        <div className="font-display text-xl mt-2">{sub}</div>
        <p className="text-sm text-white/80 mt-2">{desc}</p>
        <button className="btn btn-primary w-full mt-6">OK！</button>
      </div>
    </div>
  );
}
