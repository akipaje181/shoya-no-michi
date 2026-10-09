"use client";
// 選手の見た目（写真 or キャラ）。装備は data から解決する
import { useEffect, useState } from "react";
import Character from "./Character";
import type { AppData } from "@/lib/types";
import { ITEM_BY_ID, type ItemDef } from "@/data/items";
import { getBlob } from "@/lib/media";
import { IMG, type HeroPose } from "@/lib/img";

export function equippedItems(d: AppData): Partial<Record<ItemDef["slot"], ItemDef>> {
  const out: Partial<Record<ItemDef["slot"], ItemDef>> = {};
  for (const inv of d.inventory) {
    if (!inv.equipped) continue;
    const def = ITEM_BY_ID[inv.itemId];
    if (def) out[def.slot] = def;
  }
  return out;
}

export function useMediaUrl(id?: string): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!id) return;
    let u: string | null = null;
    let alive = true;
    getBlob(id).then((b) => {
      if (!alive || !b) return;
      u = URL.createObjectURL(b);
      setLoaded({ id, url: u });
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return id && loaded && loaded.id === id ? loaded.url : null;
}

export default function Avatar({ data, size = 200, pose = "stand", forceCharacter }: { data: AppData; size?: number; pose?: HeroPose; forceCharacter?: boolean }) {
  const style = forceCharacter ? "chara" : data.profile.avatar.style || "hero";
  const usePhoto = style === "photo" && !!data.profile.photoId;
  const url = useMediaUrl(usePhoto ? data.profile.photoId : undefined);
  if (usePhoto && url) {
    return (
      <div className="rounded-3xl overflow-hidden border-4 border-lime shadow-xl" style={{ width: size, height: size * 1.2 }}>
        <img src={url} alt="奨也" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (style === "hero" || (style === "photo" && !url)) {
    return (
      <div className="flex items-end justify-center" style={{ width: size, height: size * 1.2 }}>
        <img src={IMG.hero[pose]} alt="奨也" className="max-w-full max-h-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]" draggable={false} />
      </div>
    );
  }
  const svgPose = pose === "swing" || pose === "ready" ? pose : "stand";
  return <Character avatar={data.profile.avatar} number={data.profile.number} equipped={equippedItems(data)} size={size} pose={svgPose} />;
}
