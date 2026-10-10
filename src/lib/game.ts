// ゲームロジック：ミッション達成・XP・メダル・アイテム・連続記録
// すべて「データを受け取って新しいデータを返す」純粋関数。副作用は store 側。
import type { AppData, GameRecord, GrowthStats, MenuCategory, Measured, PracticeRecord } from "./types";
import { addDays, nowISO, today, uid, weekStart } from "./date";
import { levelFromXp, totalXp } from "./level";
import { ACHIEVEMENTS } from "@/data/achievements";
import { ITEMS } from "@/data/items";

export interface GainResult {
  data: AppData;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  newAchievements: string[];
  newItems: string[];
  alreadyDone?: boolean;
}

/** uniqueKey が同じ XP は2度入らない */
export function grantXp(d: AppData, amount: number, source: string, label: string, uniqueKey: string, date = today()): { data: AppData; granted: number } {
  if (amount <= 0) return { data: d, granted: 0 };
  if (d.xp.some((t) => t.uniqueKey === uniqueKey)) return { data: d, granted: 0 };
  const t = { id: uid("xp"), date, amount, source, label, uniqueKey, createdAt: nowISO() };
  return { data: { ...d, xp: [...d.xp, t] }, granted: amount };
}

/** 練習の種類ごとに育成ステータスを少し上げる（上限100、上がるほど伸びにくい） */
function bumpStats(stats: GrowthStats, category: MenuCategory, amountRatio: number): GrowthStats {
  const s = { ...stats };
  const gain = (k: keyof GrowthStats, base: number) => {
    const cur = s[k];
    const slow = cur < 30 ? 1 : cur < 60 ? 0.6 : cur < 85 ? 0.35 : 0.15;
    s[k] = Math.min(100, Math.round((cur + base * slow * Math.min(1.5, Math.max(0.5, amountRatio))) * 10) / 10);
  };
  switch (category) {
    case "swing": gain("meet", 1.2); gain("power", 1.0); break;
    case "fielding": gain("fielding", 1.5); gain("arm", 0.3); break;
    case "throwing": gain("arm", 1.4); gain("fielding", 0.3); break;
    case "footwork": gain("fielding", 0.8); gain("speed", 0.6); break;
    case "running": gain("speed", 1.5); break;
    case "stretch": gain("speed", 0.3); gain("power", 0.3); break;
    case "quiz": gain("knowledge", 1.5); break;
    case "care": gain("fielding", 0.4); gain("knowledge", 0.3); break; // 道具を大切にする＝守備の心がまえ
    case "free": gain("meet", 0.3); gain("fielding", 0.3); gain("speed", 0.3); break;
  }
  return s;
}

/** メダルとアイテムの新規解放をチェックして付ける */
export function settle(d: AppData): { data: AppData; newAchievements: string[]; newItems: string[] } {
  const have = new Set(d.achievements.map((a) => a.id));
  const newAchievements: string[] = [];
  const achievements = [...d.achievements];
  for (const def of ACHIEVEMENTS) {
    if (have.has(def.id)) continue;
    let ok = false;
    try { ok = def.check(d); } catch { ok = false; }
    if (ok) {
      achievements.push({ id: def.id, unlockedAt: nowISO(), seen: false });
      newAchievements.push(def.id);
    }
  }
  const level = levelFromXp(totalXp(d)).level;
  const own = new Set(d.inventory.map((i) => i.itemId));
  const inventory = [...d.inventory];
  const newItems: string[] = [];
  for (const it of ITEMS) {
    if (own.has(it.id) || it.unlockLevel > level) continue;
    // 同じ部位をまだ何も装備していなければ自動で装備
    const equippedSlot = inventory.some((i) => i.equipped && ITEMS.find((x) => x.id === i.itemId)?.slot === it.slot);
    inventory.push({ itemId: it.id, acquiredAt: nowISO(), equipped: !equippedSlot, seen: it.unlockLevel === 1 });
    if (it.unlockLevel > 1) newItems.push(it.id);
  }
  return { data: { ...d, achievements, inventory }, newAchievements, newItems };
}

/** 練習ミッションの達成。同じ日の同じメニューは XP 1回だけ。追加分は回数に合算 */
export function completeMission(d: AppData, menuId: string, amount: number, opts: { date?: string; memo?: string; measured?: Measured } = {}): GainResult {
  const date = opts.date || today();
  const menu = d.menus.find((m) => m.id === menuId);
  const levelBefore = levelFromXp(totalXp(d)).level;
  if (!menu) return { data: d, xpGained: 0, levelBefore, levelAfter: levelBefore, newAchievements: [], newItems: [] };

  const existing = d.records.find((r) => r.date === date && r.menuId === menuId);
  let records: PracticeRecord[];
  if (existing) {
    const upd: PracticeRecord = {
      ...existing,
      amount: existing.amount + Math.max(0, amount),
      memo: opts.memo ? (existing.memo ? `${existing.memo}\n${opts.memo}` : opts.memo) : existing.memo,
      measured: opts.measured ? mergeMeasured(existing.measured, opts.measured) : existing.measured,
      updatedAt: nowISO(),
    };
    records = d.records.map((r) => (r.id === existing.id ? upd : r));
  } else {
    records = [...d.records, { id: uid("pr"), date, menuId, amount: Math.max(0, amount), memo: opts.memo, measured: opts.measured, createdAt: nowISO(), updatedAt: nowISO() }];
  }
  let next: AppData = { ...d, records };

  const key = `${date}:${menuId}`;
  const alreadyDone = next.completions.some((c) => c.key === key);
  let xpGained = 0;
  if (!alreadyDone) {
    const g = grantXp(next, menu.xp, "mission", `${menu.name}をクリア`, `mission:${key}`, date);
    next = g.data;
    xpGained = g.granted;
    next = { ...next, completions: [...next.completions, { key, date, menuId, xpGranted: xpGained, completedAt: nowISO() }] };
    next = { ...next, stats: bumpStats(next.stats, menu.category, menu.defaultTarget ? amount / menu.defaultTarget : 1) };
  }

  // 週間目標（週に N 日 練習）
  const wk = checkWeekly(next, date);
  next = wk.data;
  xpGained += wk.granted;

  const s = settle(next);
  const levelAfter = levelFromXp(totalXp(s.data)).level;
  return { data: s.data, xpGained, levelBefore, levelAfter, newAchievements: s.newAchievements, newItems: s.newItems, alreadyDone };
}

function mergeMeasured(a: Measured | undefined, b: Measured): Measured {
  const m: Measured = { ...(a || {}) };
  if (b.catchTry) { m.catchTry = (m.catchTry || 0) + b.catchTry; m.catchOk = (m.catchOk || 0) + (b.catchOk || 0); }
  if (b.throwTry) { m.throwTry = (m.throwTry || 0) + b.throwTry; m.throwOk = (m.throwOk || 0) + (b.throwOk || 0); }
  if (b.run20m) m.run20m = b.run20m; // その日のベストを残す
  if (a?.run20m && b.run20m) m.run20m = Math.min(a.run20m, b.run20m);
  return m;
}

/** 練習記録を直接編集（履歴画面・保護者画面から）。XP は変えない */
export function editRecord(d: AppData, id: string, patch: Partial<PracticeRecord>): AppData {
  return { ...d, records: d.records.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: nowISO() } : r)) };
}

export function deleteRecord(d: AppData, id: string): AppData {
  return { ...d, records: d.records.filter((r) => r.id !== id) };
}

/** 週間目標：その週に weeklyGoalDays 日 練習したら 1回だけ XP */
export function checkWeekly(d: AppData, date: string): { data: AppData; granted: number } {
  const ws = weekStart(date);
  const days = new Set(d.records.filter((r) => r.date >= ws && r.date <= addDays(ws, 6)).map((r) => r.date)).size;
  if (days < d.settings.xpRules.weeklyGoalDays) return { data: d, granted: 0 };
  return grantXp(d, d.settings.xpRules.weeklyGoal, "weekly", `週間目標達成（${days}日 練習）`, `weekly:${ws}`, date);
}

export function markRestDay(d: AppData, date = today()): AppData {
  if (d.restDays.some((r) => r.date === date)) return d;
  return { ...d, restDays: [...d.restDays, { date }] };
}

/** 連続記録：練習した日か休養日が続いている日数（きょうがまだ未記録なら、きのうまでで数える） */
export function streak(d: AppData, base = today()): number {
  const active = new Set<string>([...d.records.map((r) => r.date), ...d.restDays.map((r) => r.date)]);
  let day = base;
  if (!active.has(day)) day = addDays(day, -1);
  let n = 0;
  while (active.has(day)) {
    n += 1;
    day = addDays(day, -1);
    if (n > 3650) break;
  }
  return n;
}

export function practiceDays(d: AppData): number {
  return new Set(d.records.map((r) => r.date)).size;
}

export function xpOnDate(d: AppData, date = today()): number {
  return d.xp.filter((t) => t.date === date).reduce((s, t) => s + t.amount, 0);
}

/** クイズの回答。1問ごとに少し、その日の3問 全問正解でボーナス */
export function answerQuiz(d: AppData, questionId: string, choice: number, correct: boolean, date = today()): GainResult {
  const levelBefore = levelFromXp(totalXp(d)).level;
  if (d.quiz.some((q) => q.date === date && q.questionId === questionId)) {
    return { data: d, xpGained: 0, levelBefore, levelAfter: levelBefore, newAchievements: [], newItems: [], alreadyDone: true };
  }
  let next: AppData = { ...d, quiz: [...d.quiz, { id: uid("qz"), date, questionId, choice, correct, createdAt: nowISO() }] };
  let xpGained = 0;
  if (correct) {
    const g = grantXp(next, next.settings.xpRules.quizEach, "quiz", "クイズ正解", `quiz:${date}:${questionId}`, date);
    next = g.data; xpGained += g.granted;
  }
  const todays = next.quiz.filter((q) => q.date === date);
  if (todays.length >= 3 && todays.every((q) => q.correct)) {
    const g = grantXp(next, next.settings.xpRules.quizPerfect, "quiz", "クイズ全問正解！", `quizperfect:${date}`, date);
    next = g.data; xpGained += g.granted;
    // 「野球クイズ」メニューも達成扱いにする（XP はメニュー分は付けない。二重防止）
    const key = `${date}:quiz`;
    if (!next.completions.some((c) => c.key === key)) {
      next = { ...next, completions: [...next.completions, { key, date, menuId: "quiz", xpGranted: 0, completedAt: nowISO() }] };
      next = { ...next, stats: bumpStats(next.stats, "quiz", 1) };
    }
  }
  const s = settle(next);
  return { data: s.data, xpGained, levelBefore, levelAfter: levelFromXp(totalXp(s.data)).level, newAchievements: s.newAchievements, newItems: s.newItems };
}

/** 試合の保存（新規・更新）。XP は1試合につき1回 */
export function saveGame(d: AppData, g: GameRecord): GainResult {
  const levelBefore = levelFromXp(totalXp(d)).level;
  const exists = d.games.some((x) => x.id === g.id);
  const games = exists ? d.games.map((x) => (x.id === g.id ? { ...g, updatedAt: nowISO() } : x)) : [...d.games, g];
  let next: AppData = { ...d, games: games.sort((a, b) => a.date.localeCompare(b.date)) };
  const r = grantXp(next, next.settings.xpRules.gameRecord, "game", "試合を記録", `game:${g.id}`, g.date);
  next = r.data;
  const s = settle(next);
  return { data: s.data, xpGained: r.granted, levelBefore, levelAfter: levelFromXp(totalXp(s.data)).level, newAchievements: s.newAchievements, newItems: s.newItems };
}

export function deleteGame(d: AppData, id: string): AppData {
  return { ...d, games: d.games.filter((g) => g.id !== id) };
}

/** ロードマップの目標達成 */
export function achieveGoal(d: AppData, goalId: string, date = today(), comment?: string): GainResult {
  const levelBefore = levelFromXp(totalXp(d)).level;
  const goals = d.goals.map((g) => (g.id === goalId ? { ...g, achievedAt: date, comment: comment ?? g.comment } : g));
  let next: AppData = { ...d, goals };
  const r = grantXp(next, next.settings.xpRules.goalAchieved, "goal", "目標を達成！", `goal:${goalId}`, date);
  next = r.data;
  const s = settle(next);
  return { data: s.data, xpGained: r.granted, levelBefore, levelAfter: levelFromXp(totalXp(s.data)).level, newAchievements: s.newAchievements, newItems: s.newItems };
}

export function unachieveGoal(d: AppData, goalId: string): AppData {
  return { ...d, goals: d.goals.map((g) => (g.id === goalId ? { ...g, achievedAt: undefined } : g)) };
}

/** 通算成績 */
export function careerStats(games: GameRecord[]) {
  const t = games.reduce(
    (s, g) => ({
      games: s.games + 1,
      pa: s.pa + (g.pa || 0), ab: s.ab + (g.ab || 0), hits: s.hits + (g.hits || 0),
      rbi: s.rbi + (g.rbi || 0), runs: s.runs + (g.runs || 0), steals: s.steals + (g.steals || 0),
      walks: s.walks + (g.walks || 0), hr: s.hr + (g.homeruns || 0),
      wins: s.wins + (g.result === "win" ? 1 : 0), loses: s.loses + (g.result === "lose" ? 1 : 0),
    }),
    { games: 0, pa: 0, ab: 0, hits: 0, rbi: 0, runs: 0, steals: 0, walks: 0, hr: 0, wins: 0, loses: 0 },
  );
  const avg = t.ab > 0 ? t.hits / t.ab : null;
  const obpDen = t.ab + t.walks;
  const obp = obpDen > 0 ? (t.hits + t.walks) / obpDen : null;
  return { ...t, avg, obp };
}

export function fmtAvg(v: number | null): string {
  if (v === null) return "---";
  return v.toFixed(3).replace(/^0/, "");
}

export function equipItem(d: AppData, itemId: string): AppData {
  const def = ITEMS.find((i) => i.id === itemId);
  if (!def) return d;
  return {
    ...d,
    inventory: d.inventory.map((i) => {
      const slot = ITEMS.find((x) => x.id === i.itemId)?.slot;
      if (i.itemId === itemId) return { ...i, equipped: true, seen: true };
      if (slot === def.slot) return { ...i, equipped: false };
      return i;
    }),
  };
}

export function markSeenOne(d: AppData, kind: "medal" | "item", id: string): AppData {
  if (kind === "medal") return { ...d, achievements: d.achievements.map((a) => (a.id === id ? { ...a, seen: true } : a)) };
  return { ...d, inventory: d.inventory.map((i) => (i.itemId === id ? { ...i, seen: true } : i)) };
}

export function markSeen(d: AppData): AppData {
  return {
    ...d,
    achievements: d.achievements.map((a) => (a.seen ? a : { ...a, seen: true })),
    inventory: d.inventory.map((i) => (i.seen ? i : { ...i, seen: true })),
  };
}
