// 日付のユーティリティ（端末のローカル日付で扱う）
import type { ISODate } from "./types";

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86400000);
}

export function formatJa(s: ISODate, withYear = false): string {
  const d = parseISODate(s);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${withYear ? `${d.getFullYear()}年` : ""}${d.getMonth() + 1}月${d.getDate()}日(${w})`;
}

export function monthLabel(y: number, m: number): string {
  return `${y}年${m + 1}月`;
}

/** その週の月曜日（週間目標の区切り） */
export function weekStart(s: ISODate): ISODate {
  const d = parseISODate(s);
  const day = (d.getDay() + 6) % 7; // 月=0
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function uid(prefix = ""): string {
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${r}`;
}
