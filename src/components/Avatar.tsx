"use client";
// 選手の見た目（写真 or キャラ）。装備は data から解決する
import { useEffect, useState } from "react";
import Character from "./Character";
import type { AppData } from "@/lib/types";
import { ITEM_BY_ID, type ItemDef } from "@/data/items";
import { getBlob } from "@/lib/media";
import { getData } from "@/lib/store";
import { fetchCloudPhoto } from "@/lib/sync";
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

/** 写真・動画の URL。端末に無い写真は同期先から取ってくる。missing = この端末に無く、取れもしなかった */
export function useMediaState(id?: string): { url: string | null; missing: boolean } {
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let u: string | null = null;
    let alive = true;
    getBlob(id)
      .then(async (b) => {
        if (b) return b;
        const m = getData().media.find((x) => x.id === id);
        return m ? await fetchCloudPhoto(m) : null;
      })
      .then((b) => {
        if (!alive) return;
        if (!b) { setLoaded({ id, url: null }); return; }
        u = URL.createObjectURL(b);
        setLoaded({ id, url: u });
      });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  const hit = id && loaded && loaded.id === id ? loaded : null;
  return { url: hit?.url ?? null, missing: !!hit && hit.url === null };
}
export function useMediaUrl(id?: string): string | null {
  return useMediaState(id).url;
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
