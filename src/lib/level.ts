// レベルと XP の計算（純粋関数）
import type { AppData } from "./types";

/** Lv.n → n+1 に必要な XP。レベルが上がるほど増える */
export function needForLevel(level: number): number {
  return 100 + (level - 1) * 25;
}

export function totalXp(d: AppData): number {
  return d.xp.reduce((s, t) => s + t.amount, 0);
}

export interface LevelInfo {
  level: number;
  current: number; // 今のレベルで貯まった分
  need: number; // 次のレベルまでに必要な合計
  remain: number;
  total: number;
}

export function levelFromXp(total: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, total);
  while (rest >= needForLevel(level) && level < 99) {
    rest -= needForLevel(level);
    level += 1;
  }
  const need = needForLevel(level);
  return { level, current: rest, need, remain: need - rest, total };
}

/** 称号（レベルで変わる）。バッジ画像 rank-N の文字と一致させる */
export const RANKS: { level: number; title: string }[] = [
  { level: 1, title: "新入部員" },
  { level: 6, title: "準レギュラー" },
  { level: 12, title: "レギュラー" },
  { level: 20, title: "チームの主力" },
  { level: 30, title: "最強の選手" },
  { level: 40, title: "レジェンド" },
  { level: 55, title: "殿堂入り選手" },
  { level: 70, title: "プロ野球選手" },
];

/** 称号の段階 1〜8（バッジ画像 rank-N に対応） */
export function rankForLevel(level: number): number {
  let r = 1;
  RANKS.forEach((x, i) => { if (level >= x.level) r = i + 1; });
  return r;
}

export function titleForLevel(level: number): string {
  return RANKS[rankForLevel(level) - 1].title;
}
