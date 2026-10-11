// アプリ内の「お知らせ」。お父さん⇔奨也のやりとりで、まだ読んでいないものを数える
// （データは端末の中だけなので、同じ端末の中でのお知らせ。ホーム画面アイコンのバッジにも出す）
import type { AppData, DiaryNote } from "./types";

export function hasNoteContent(n: DiaryNote): boolean {
  return !!(n.practice.trim() || n.coachWords.length || n.didWell.trim() || n.nextGoal.trim());
}

/** お父さんがまだ読んでいない奨也のノート（新しい順） */
export function unreadNotesForParent(d: AppData): DiaryNote[] {
  return (d.notes || [])
    .filter((n) => hasNoteContent(n) && (!n.parentReadAt || n.parentReadAt < n.updatedAt))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** 奨也がまだ読んでいない、お父さんのひとこと（新しい順） */
export function unreadCommentsForChild(d: AppData): DiaryNote[] {
  return (d.notes || [])
    .filter((n) => !!n.parentComment && !!n.parentCommentAt && (!n.commentReadAt || n.commentReadAt < n.parentCommentAt))
    .sort((a, b) => (b.parentCommentAt || "").localeCompare(a.parentCommentAt || ""));
}

/** ホーム画面に追加したアプリのアイコンに数字を出す（対応端末のみ。iOS は 16.4 以上でホーム画面に追加したとき） */
export function syncAppBadge(count: number): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => undefined);
    else nav.clearAppBadge?.()?.catch(() => undefined);
  } catch {
    /* 非対応 */
  }
}

// ---- 端末の通知（iPhone はホーム画面に追加した web アプリだけ対応。iOS 16.4 以上）
// iOS ではアイコンの数字（バッジ）も、通知の許可を取ってからでないと出ない

export type NotifyStatus = "unsupported" | "not-installed" | "default" | "granted" | "denied";

/** ホーム画面に追加して開いているか */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone || window.matchMedia("(display-mode: standalone)").matches;
}

export function notifyStatus(): NotifyStatus {
  if (typeof window === "undefined" || !("Notification" in window)) return isStandalone() ? "unsupported" : "not-installed";
  if (!isStandalone() && /iPhone|iPad|iPod/.test(navigator.userAgent)) return "not-installed";
  return Notification.permission as NotifyStatus;
}

/** 通知の許可をもらう（ボタンを押したときに呼ぶ。自動では出せない） */
export async function requestNotifyPermission(): Promise<NotifyStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    const p = await Notification.requestPermission();
    return p as NotifyStatus;
  } catch {
    return "unsupported";
  }
}

/** 端末の通知センターに出す（許可があるときだけ。無ければ何もしない） */
export async function showLocalNotification(title: string, body: string, path = "/home/"): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg) return false;
    await reg.showNotification(title, { body, icon: `${base}/icon-192.png`, badge: `${base}/icon-192.png`, tag: `shoya-${path}`, data: { url: `${base}${path}` } });
    return true;
  } catch {
    return false;
  }
}
