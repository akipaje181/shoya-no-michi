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
