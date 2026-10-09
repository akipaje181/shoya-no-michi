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

/** 称号の段階 1〜6（バッジ画像 rank-N に対応） */
export function rankForLevel(level: number): number {
  if (level >= 40) return 6;
  if (level >= 30) return 5;
  if (level >= 20) return 4;
  if (level >= 12) return 3;
  if (level >= 6) return 2;
  return 1;
}

export function titleForLevel(level: number): string {
  if (level >= 40) return "レジェンド";
  if (level >= 30) return "スター選手";
  if (level >= 20) return "レギュラー";
  if (level >= 12) return "準レギュラー";
  if (level >= 6) return "ルーキー";
  return "新入部員";
}
