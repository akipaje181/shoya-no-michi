// 予定（練習・試合・大会）のユーティリティ
import type { AppData, EventKind, ScheduleEvent } from "./types";
import { addDays, diffDays, today } from "./date";

export const KIND_LABEL: Record<EventKind, string> = { practice: "チーム練習", game: "試合", tournament: "大会", other: "そのほか" };
export const KIND_ICON: Record<EventKind, string> = { practice: "🏃", game: "⚾", tournament: "🏆", other: "📌" };
export const KIND_COLOR: Record<EventKind, string> = { practice: "bg-blue/30 text-blue-2", game: "bg-lime/20 text-lime", tournament: "bg-gold/25 text-gold", other: "bg-white/10 text-white/80" };

export function sortEvents(ev: ScheduleEvent[]): ScheduleEvent[] {
  return [...ev].sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
}

/** きょう以降の予定（近い順） */
export function upcoming(d: AppData, days = 30, base = today()): ScheduleEvent[] {
  const end = addDays(base, days);
  return sortEvents(d.events.filter((e) => e.date >= base && e.date <= end));
}

/** 「きょう」「あした」「あと3日」 */
export function relativeLabel(date: string, base = today()): string {
  const n = diffDays(date, base);
  if (n === 0) return "きょう";
  if (n === 1) return "あした";
  if (n === 2) return "あさって";
  if (n < 0) return `${-n}日前`;
  return `あと${n}日`;
}
