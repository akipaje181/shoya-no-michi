"use client";
// 端末間の同期（Supabase）。家族コードを知っている端末どうしで、同じ記録を共有する。
// 文字の記録は AppData を丸ごと合体（消したものは tombstones で復活させない）、写真は縮小版を送る。動画は撮った端末だけ。
import type { AppData, DiaryNote, MediaAsset } from "./types";
import { getData, isHydrated, replaceData, subscribeData, ID_FIELDS } from "./store";
import { getBlob, putBlob } from "./media";
import { nowISO } from "./date";
import { showLocalNotification, unreadCommentsForChild, unreadNotesForParent } from "./notify";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const CFG_KEY = "shoya.sync";

export type SyncRole = "child" | "parent" | "";
export interface SyncConfig { code: string; role: SyncRole; lastSyncAt?: string; lastError?: string; }

export function syncAvailable(): boolean { return !!URL && !!KEY; }

export function getSyncConfig(): SyncConfig | null {
  try { const raw = localStorage.getItem(CFG_KEY); return raw ? (JSON.parse(raw) as SyncConfig) : null; } catch { return null; }
}
function setSyncConfig(c: SyncConfig | null) {
  try { if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c)); else localStorage.removeItem(CFG_KEY); } catch { /* ignore */ }
  cfgListeners.forEach((l) => l());
}
const cfgListeners = new Set<() => void>();
export function subscribeSync(l: () => void) { cfgListeners.add(l); return () => { cfgListeners.delete(l); }; }

export function makeFamilyCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 読みまちがえやすい I O 0 1 は抜く
  const arr = new Uint8Array(8); crypto.getRandomValues(arr);
  return "SHOYA-" + Array.from(arr, (b) => A[b % A.length]).join("");
}
export function normalizeCode(s: string): string { return s.trim().toUpperCase().replace(/\s+/g, ""); }

// ---- Supabase RPC（SDK なしで fetch）
async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { apikey: KEY, "Content-Type": "application/json" };
  if (KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${KEY}`; // 旧式の anon key（JWT）のときだけ
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
type Remote = { data: AppData; updated_at: string } | null;
const pull = (code: string) => rpc<Remote>("family_pull", { p_code: code });
const push = (code: string, data: AppData, base: string | null) => rpc<{ ok?: boolean; conflict?: boolean; data?: AppData; updated_at: string }>("family_push", { p_code: code, p_data: data, p_base: base });

// ---- 合体
type Keyed = Record<string, unknown>;
function newer(a: Keyed, b: Keyed, aWins: boolean): Keyed {
  const ua = a.updatedAt as string | undefined, ub = b.updatedAt as string | undefined;
  if (ua && ub && ua !== ub) return ua > ub ? a : b;
  return aWins ? a : b;
}
function mergeNote(a: DiaryNote, b: DiaryNote, aWins: boolean): DiaryNote {
  const base = newer(a as unknown as Keyed, b as unknown as Keyed, aWins) as unknown as DiaryNote;
  const max = (x?: string, y?: string) => (!x ? y : !y ? x : x > y ? x : y);
  // お父さんのひとことは、書いた時刻が新しい方
  const pc = (a.parentCommentAt || "") >= (b.parentCommentAt || "") ? a : b;
  return { ...base, parentComment: pc.parentComment, parentCommentAt: pc.parentCommentAt, commentReadAt: max(a.commentReadAt, b.commentReadAt), parentReadAt: max(a.parentReadAt, b.parentReadAt) };
}
export function mergeData(local: AppData, remote: AppData): AppData {
  const localWins = (local.updatedAt || "") >= (remote.updatedAt || "");
  const dead = new Set([...(local.tombstones || []), ...(remote.tombstones || [])]);
  const out: AppData = { ...(localWins ? local : remote) };
  for (const k of Object.keys(ID_FIELDS) as (keyof AppData)[]) {
    const get = ID_FIELDS[k]!;
    const map = new Map<string, Keyed>();
    for (const x of (remote[k] as unknown[]) || []) map.set(get(x), x as Keyed);
    for (const x of (local[k] as unknown[]) || []) {
      const id = get(x); const r = map.get(id);
      if (!r) { map.set(id, x as Keyed); continue; }
      let m: Keyed;
      if (k === "notes") m = mergeNote(x as DiaryNote, r as unknown as DiaryNote, localWins) as unknown as Keyed;
      else {
        m = newer(x as Keyed, r, localWins);
        if (k === "achievements" || k === "inventory") m = { ...m, seen: !!(x as Keyed).seen || !!r.seen };
        if (k === "messages") m = { ...m, readAt: (x as Keyed).readAt || r.readAt };
        if (k === "media") m = { ...m, cloud: !!(x as Keyed).cloud || !!r.cloud };
        if (k === "consults") m = { ...m, doneAt: (x as Keyed).doneAt || r.doneAt };
        if (k === "goals") m = { ...m, achievedAt: (x as Keyed).achievedAt || r.achievedAt, mediaIds: [...new Set([...((x as Keyed).mediaIds as string[] || []), ...((r.mediaIds as string[]) || [])])] };
      }
      map.set(id, m);
    }
    let arr = [...map.entries()].filter(([id]) => !dead.has(`${k}:${id}`)).map(([, v]) => v);
    if (k === "xp") { // 同じ uniqueKey は1つだけ（早い方）
      const seen = new Set<string>();
      arr = arr.sort((a, b) => String(a.createdAt || a.date || "").localeCompare(String(b.createdAt || b.date || ""))).filter((x) => { const u = x.uniqueKey as string | undefined; if (!u) return true; if (seen.has(u)) return false; seen.add(u); return true; });
    }
    (out as unknown as Record<string, unknown>)[k] = arr;
  }
  out.rulesRead = [...new Set([...(local.rulesRead || []), ...(remote.rulesRead || [])])];
  out.tombstones = [...dead].slice(-3000);
  const sk = Object.keys({ ...local.stats, ...remote.stats }) as (keyof AppData["stats"])[];
  out.stats = Object.fromEntries(sk.map((s) => [s, Math.max(Number(local.stats?.[s] || 0), Number(remote.stats?.[s] || 0))])) as unknown as AppData["stats"];
  out.version = Math.max(local.version, remote.version);
  out.updatedAt = (local.updatedAt || "") > (remote.updatedAt || "") ? local.updatedAt : remote.updatedAt;
  return out;
}

// ---- 同期のループ
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let started = false;
const canon = (d: AppData) => JSON.stringify({ ...d, updatedAt: undefined });

async function syncOnce(reason: string): Promise<void> {
  const cfg = getSyncConfig();
  if (!cfg || !syncAvailable() || !isHydrated() || running) return;
  running = true;
  try {
    const before = getData();
    const beforeNotes = unreadNotesForParent(before).length, beforeComments = unreadCommentsForChild(before).length;
    let remote = await pull(cfg.code);
    for (let attempt = 0; attempt < 3; attempt++) {
      const local = getData();
      if (!remote) { const r = await push(cfg.code, local, null); if (r.conflict && r.data) { remote = { data: r.data, updated_at: r.updated_at }; continue; } break; }
      const merged = mergeData(local, remote.data);
      if (canon(merged) !== canon(local)) replaceData(merged);
      if (canon(merged) !== canon(remote.data)) {
        const r = await push(cfg.code, { ...merged, updatedAt: nowISO() }, remote.updated_at);
        if (r.conflict && r.data) { remote = { data: r.data, updated_at: r.updated_at }; continue; }
      }
      break;
    }
    dirty = false;
    await uploadPendingPhotos(cfg.code);
    setSyncConfig({ ...cfg, lastSyncAt: nowISO(), lastError: undefined });
    // 別の端末からの新着を端末の通知に出す（役割に合わせて）
    const after = getData();
    if (cfg.role === "parent" && unreadNotesForParent(after).length > beforeNotes) void showLocalNotification(`📓 ${after.profile.name}がノートを書きました`, "お父さんの応援 → ノート で読めます", "/parent/");
    if (cfg.role === "child" && unreadCommentsForChild(after).length > beforeComments) void showLocalNotification(`💬 ${after.settings.parentName}からひとこと`, "ホームを開いてね", "/home/");
  } catch (e) {
    setSyncConfig({ ...cfg, lastError: `${reason}: ${(e as Error).message}` });
  } finally {
    running = false;
    if (dirty) schedule(1500);
  }
}
function schedule(ms: number) { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = null; void syncOnce("auto"); }, ms); }

/** アプリ起動時に1回呼ぶ。設定が無ければ何もしない */
export function startSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  subscribeData(() => { if (getSyncConfig()) { dirty = true; schedule(1500); } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") schedule(300); });
  window.addEventListener("online", () => schedule(300));
  setInterval(() => { if (document.visibilityState === "visible") schedule(0); }, 20000);
  schedule(500);
}
export function syncNow(): Promise<void> { return syncOnce("manual"); }

/** この端末で家族コードを作る（今の記録を同期先に送る） */
export async function createFamily(role: SyncRole): Promise<string> {
  const code = makeFamilyCode();
  setSyncConfig({ code, role });
  await syncOnce("create");
  const c = getSyncConfig();
  if (c?.lastError) { setSyncConfig(null); throw new Error(c.lastError); }
  return code;
}
/** 家族コードを入れる（同期先の記録と合体する） */
export async function joinFamily(codeRaw: string, role: SyncRole): Promise<void> {
  const code = normalizeCode(codeRaw);
  if (!/^SHOYA-[A-Z2-9]{8}$/.test(code)) throw new Error("コードの形がちがいます（例：SHOYA-ABCD2345）");
  const remote = await pull(code);
  if (!remote) throw new Error("そのコードの記録が見つかりません");
  setSyncConfig({ code, role });
  await syncOnce("join");
}
export function setSyncRole(role: SyncRole) { const c = getSyncConfig(); if (c) setSyncConfig({ ...c, role }); }
export function stopSync() { setSyncConfig(null); }

// ---- 写真
async function blobToB64(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
}
function b64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
async function uploadPendingPhotos(code: string): Promise<void> {
  const d = getData();
  const pending = d.media.filter((m) => m.kind === "photo" && !m.cloud).slice(0, 3);
  for (const m of pending) {
    const blob = await getBlob(m.id);
    if (!blob) continue; // この端末に無い（別の端末の写真でまだ届いていない）
    if (blob.size > 2.5 * 1024 * 1024) continue;
    const ok = await rpc<boolean>("photo_put", { p_code: code, p_id: m.id, p_mime: blob.type || m.mime, p_b64: await blobToB64(blob) });
    if (ok) { const { updateData } = await import("./store"); updateData((x) => ({ ...x, media: x.media.map((y) => (y.id === m.id ? { ...y, cloud: true } : y)) })); }
  }
}
const fetching = new Map<string, Promise<Blob | null>>();
/** 端末に無い写真を同期先から取ってくる（取れたら端末にも保存） */
export function fetchCloudPhoto(m: MediaAsset): Promise<Blob | null> {
  const cfg = getSyncConfig();
  if (!cfg || !syncAvailable() || m.kind !== "photo" || !m.cloud) return Promise.resolve(null);
  let p = fetching.get(m.id);
  if (!p) {
    p = rpc<{ mime: string; b64: string } | null>("photo_get", { p_code: cfg.code, p_id: m.id })
      .then(async (r) => { if (!r) return null; const b = b64ToBlob(r.b64, r.mime); await putBlob(m.id, b); return b; })
      .catch(() => null)
      .finally(() => fetching.delete(m.id));
    fetching.set(m.id, p);
  }
  return p;
}
export function deleteCloudPhoto(id: string): void {
  const cfg = getSyncConfig();
  if (!cfg || !syncAvailable()) return;
  void rpc("photo_delete", { p_code: cfg.code, p_id: id }).catch(() => undefined);
}
