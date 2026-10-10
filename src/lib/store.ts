"use client";
// データの保存と購読。
// 今は localStorage。将来 Supabase に移すときは DataStore の実装を差し替える。
import { useSyncExternalStore } from "react";
import type { AppData } from "./types";
import { makeDefaultData, STORAGE_KEY, DATA_VERSION, DEFAULT_MENUS, DEFAULT_GOALS, DEFAULT_SETTINGS, DEFAULT_PROFILE, DEFAULT_STATS } from "@/data/defaults";
import { nowISO } from "./date";

export interface DataStore {
  load(): AppData | null;
  save(d: AppData): void;
}

class LocalStore implements DataStore {
  load(): AppData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  save(d: AppData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      // 1つ前の版も残しておく（壊れたときの保険）
      localStorage.setItem(`${STORAGE_KEY}.bak`, JSON.stringify(d));
    } catch (e) {
      console.error("save failed", e);
    }
  }
}

/** 古いデータに足りない項目を補う */
export function migrate(raw: Partial<AppData>): AppData {
  const base = makeDefaultData(nowISO());
  const d: AppData = { ...base, ...raw } as AppData;
  d.version = DATA_VERSION;
  d.profile = { ...DEFAULT_PROFILE, ...(raw.profile || {}), avatar: { ...DEFAULT_PROFILE.avatar, ...(raw.profile?.avatar || {}) } };
  if (!d.profile.avatar.style) d.profile.avatar.style = d.profile.avatar.usePhoto && d.profile.photoId ? "photo" : "hero";
  d.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}), xpRules: { ...DEFAULT_SETTINGS.xpRules, ...(raw.settings?.xpRules || {}) } };
  d.stats = { ...DEFAULT_STATS, ...(raw.stats || {}) };
  // 組み込みメニュー・目標が消えていたら足す（親が消したものは builtin でも復活させない: 削除は active=false で表す）
  const menuIds = new Set((d.menus || []).map((m) => m.id));
  for (const m of DEFAULT_MENUS) {
    if (menuIds.has(m.id)) continue;
    // 新しい組み込みメニュー（例: 道具の手入れ）は既存データにも足す。並びは末尾
    const maxOrder = d.menus.reduce((x, y) => Math.max(x, y.order), 0);
    d.menus.push(raw.menus ? { ...m, order: m.id === "free" ? m.order : maxOrder + 1 } : m);
  }
  if (!raw.goals || raw.goals.length === 0) d.goals = DEFAULT_GOALS;
  for (const k of ["records", "completions", "xp", "games", "achievements", "inventory", "media", "quiz", "messages", "rewards", "restDays", "events", "rulesRead"] as const) {
    if (!Array.isArray(d[k])) (d as unknown as Record<string, unknown>)[k] = [];
  }
  return d;
}

const store = new LocalStore();
let state: AppData | null = null;
let hydrated = false;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: AppData = makeDefaultData("1970-01-01T00:00:00.000Z");

function ensure(): AppData {
  if (state) return state;
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  state = store.load() || makeDefaultData(nowISO());
  hydrated = true;
  return state;
}

export function getData(): AppData {
  return ensure();
}

export function isHydrated(): boolean {
  return hydrated;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** データを更新する。fn は新しいオブジェクトを返す（元を書き換えない） */
export function updateData(fn: (d: AppData) => AppData): AppData {
  const cur = ensure();
  const next = { ...fn(cur), updatedAt: nowISO() };
  state = next;
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.save(next), 150);
  return next;
}

/** 読み込み（書き出したファイルから）。全部置き換える */
export function replaceData(d: AppData): void {
  state = migrate(d);
  store.save(state);
  listeners.forEach((l) => l());
}

export function resetData(): void {
  state = makeDefaultData(nowISO());
  store.save(state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** React から使う。SSR 時は初期値、ブラウザでは保存データ */
export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, ensure, () => SERVER_SNAPSHOT);
}

/** ブラウザで読み込み済みか（SSR の初期値を本物と間違えないため） */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => { ensure(); return hydrated; }, () => false);
}

export function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (state) store.save(state);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushSave);
  window.addEventListener("beforeunload", flushSave);
}
