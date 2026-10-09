// ゲーム内アイテム（オリジナルデザイン）。レベルで解放され、キャラに装備できる。
export type ItemSlot = "bat" | "glove" | "gloves" | "spikes" | "uniform";

export interface ItemDef {
  id: string;
  slot: ItemSlot;
  name: string;
  desc: string;
  unlockLevel: number;
  color: string; // 描画に使う主色
  color2?: string;
  icon: string;
}

export const SLOT_LABEL: Record<ItemSlot, string> = {
  bat: "バット",
  glove: "グローブ",
  gloves: "バッティング手袋",
  spikes: "スパイク",
  uniform: "ユニフォーム",
};

export const ITEMS: ItemDef[] = [
  { id: "bat_wood", slot: "bat", name: "木のバット", desc: "さいしょの相棒", unlockLevel: 1, color: "#C68E4D", icon: "🏏" },
  { id: "glove_basic", slot: "glove", name: "ベーシックグローブ", desc: "ゴロをしっかり捕る", unlockLevel: 1, color: "#8B5A2B", icon: "🧤" },
  { id: "bat_blue", slot: "bat", name: "ブルーライトニング", desc: "青いいなずまのバット", unlockLevel: 3, color: "#247BDE", color2: "#A8E66C", icon: "🏏" },
  { id: "gloves_lime", slot: "gloves", name: "ライムグリップ手袋", desc: "黄緑の手袋。グリップ力アップ", unlockLevel: 4, color: "#A8E66C", icon: "🧤" },
  { id: "glove_navy", slot: "glove", name: "ネイビーフィールダー", desc: "守備の名手のグローブ", unlockLevel: 6, color: "#0C1C35", color2: "#247BDE", icon: "🧤" },
  { id: "spikes_speed", slot: "spikes", name: "スピードスパイク", desc: "足が速くなった気がする！", unlockLevel: 8, color: "#A8E66C", color2: "#0C1C35", icon: "👟" },
  { id: "uniform_away", slot: "uniform", name: "ビジターユニフォーム", desc: "ネイビーのビジター用", unlockLevel: 10, color: "#0C1C35", color2: "#A8E66C", icon: "👕" },
  { id: "bat_lime", slot: "bat", name: "ライムスラッガー", desc: "黄緑に光る強打者のバット", unlockLevel: 12, color: "#A8E66C", color2: "#247BDE", icon: "🏏" },
  { id: "gloves_pro", slot: "gloves", name: "プロモデル手袋", desc: "プロと同じ手袋", unlockLevel: 14, color: "#FFFFFF", color2: "#247BDE", icon: "🧤" },
  { id: "glove_gold", slot: "glove", name: "ゴールデングラブ", desc: "守備の最高の栄誉", unlockLevel: 18, color: "#E8B923", icon: "🧤" },
  { id: "spikes_pro", slot: "spikes", name: "プロスパイク", desc: "本気の走りに応える", unlockLevel: 20, color: "#247BDE", color2: "#FFFFFF", icon: "👟" },
  { id: "uniform_champ", slot: "uniform", name: "チャンピオンユニフォーム", desc: "優勝チームだけの金のライン", unlockLevel: 25, color: "#FFFFFF", color2: "#E8B923", icon: "👕" },
  { id: "bat_legend", slot: "bat", name: "レジェンドバット", desc: "伝説の選手が使ったという黒いバット", unlockLevel: 30, color: "#111111", color2: "#E8B923", icon: "🏏" },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
