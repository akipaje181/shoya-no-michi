"use client";
// 達成演出のイベント（XP 獲得・レベルアップ）。メダルとアイテムは data の seen フラグから拾う
import type { GainResult } from "./game";

export type CelebrateEvent =
  | { type: "xp"; amount: number; label?: string }
  | { type: "levelup"; level: number }
  | { type: "text"; text: string; icon?: string };

const listeners = new Set<(e: CelebrateEvent) => void>();

export function pushCelebrate(e: CelebrateEvent): void {
  listeners.forEach((l) => l(e));
}

export function onCelebrate(l: (e: CelebrateEvent) => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** GainResult から演出を出す（XP → レベルアップの順） */
export function celebrateGain(r: GainResult, label?: string): void {
  if (r.xpGained > 0) pushCelebrate({ type: "xp", amount: r.xpGained, label });
  if (r.levelAfter > r.levelBefore) pushCelebrate({ type: "levelup", level: r.levelAfter });
}

let audioCtx: AudioContext | null = null;
/** 音は設定でオンのときだけ。短い電子音を合成（音源ファイル不要） */
export function chime(kind: "xp" | "level" | "medal" | "ok" | "ng", enabled: boolean): void {
  if (!enabled || typeof window === "undefined") return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioCtx;
    const seq: [number, number][] =
      kind === "level" ? [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]]
      : kind === "medal" ? [[784, 0.12], [988, 0.12], [1175, 0.3]]
      : kind === "xp" ? [[880, 0.08], [1175, 0.14]]
      : kind === "ok" ? [[659, 0.08], [880, 0.12]]
      : [[220, 0.18]];
    let t = ctx.currentTime;
    for (const [f, d] of seq) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d * 0.9;
    }
  } catch {
    /* 音が出なくても動作に影響しない */
  }
}
