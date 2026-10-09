"use client";
import { useState } from "react";
import Character from "@/components/Character";
import { equippedItems } from "@/components/Avatar";
import { Card, PageHeader, Segmented } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { ACHIEVEMENTS } from "@/data/achievements";
import { ITEMS, SLOT_LABEL, type ItemSlot } from "@/data/items";
import { levelFromXp, totalXp } from "@/lib/level";
import { equipItem } from "@/lib/game";
import { formatJa } from "@/lib/date";

const TIER_STYLE: Record<string, string> = { bronze: "from-[#b87333] to-[#7a4a1e]", silver: "from-[#d9dde3] to-[#8d949e]", gold: "from-[#ffd75e] to-[#c9971b]", trophy: "from-[#ffe58a] to-[#e8b923]" };

export default function TrophiesPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [tab, setTab] = useState<"medal" | "item">("medal");
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  const have = new Map(data.achievements.map((a) => [a.id, a]));
  const lv = levelFromXp(totalXp(data)).level;
  const own = new Map(data.inventory.map((i) => [i.itemId, i]));

  return (
    <div>
      <PageHeader title="メダル・アイテム" sub={`メダル ${have.size} / ${ACHIEVEMENTS.length}　アイテム ${own.size} / ${ITEMS.length}`} />
      <div className="px-4">
        <Segmented value={tab} options={[{ v: "medal", label: "🏅 メダル" }, { v: "item", label: "🎒 アイテム" }]} onChange={setTab} />
        {tab === "medal" ? (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {ACHIEVEMENTS.map((a) => {
              const got = have.get(a.id);
              return (
                <div key={a.id} className={`card p-3 text-center ${got ? "" : "opacity-60"}`}>
                  <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl bg-gradient-to-b ${got ? TIER_STYLE[a.tier] : "from-[#2a3a5a] to-[#1a2740]"} ${got ? "shadow-[0_0_18px_rgba(255,220,100,0.35)]" : "grayscale"}`}>
                    {got ? a.icon : "🔒"}
                  </div>
                  <div className="text-xs font-bold mt-2 leading-tight">{a.title}</div>
                  <div className="text-[10px] text-muted mt-1 leading-tight">{got ? formatJa(got.unlockedAt.slice(0, 10)) : a.hint}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3">
            <Card className="flex items-center gap-3">
              <Character avatar={data.profile.avatar} number={data.profile.number} equipped={equippedItems(data)} size={110} pose="ready" />
              <div className="text-sm">
                <div className="font-display text-lg">Lv.{lv}</div>
                <div className="text-muted text-xs">アイテムはレベルで解放。タップで装備！</div>
              </div>
            </Card>
            {(Object.keys(SLOT_LABEL) as ItemSlot[]).map((slot) => (
              <div key={slot}>
                <div className="font-display text-base mt-4 mb-2 px-1">{SLOT_LABEL[slot]}</div>
                <div className="grid grid-cols-2 gap-2">
                  {ITEMS.filter((i) => i.slot === slot).map((it) => {
                    const inv = own.get(it.id);
                    const locked = !inv;
                    return (
                      <button
                        key={it.id}
                        disabled={locked}
                        onClick={() => updateData((d) => equipItem(d, it.id))}
                        className={`card p-3 text-left flex items-center gap-2 ${locked ? "opacity-50" : "tap"} ${inv?.equipped ? "!border-lime" : ""}`}
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: locked ? "rgba(0,0,0,.3)" : `linear-gradient(135deg, ${it.color}, ${it.color2 || it.color})` }}>
                          {locked ? "🔒" : it.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{it.name}</div>
                          <div className="text-[10px] text-muted">{locked ? `Lv.${it.unlockLevel} で解放` : inv?.equipped ? "✅ 装備中" : "タップで装備"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
