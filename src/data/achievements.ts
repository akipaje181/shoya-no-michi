// メダル・トロフィーの定義。条件は game.ts の checkAchievements で判定する。
import type { AppData } from "@/lib/types";
import { totalXp, levelFromXp } from "@/lib/level";

export type AchievementTier = "bronze" | "silver" | "gold" | "trophy";

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tier: AchievementTier;
  hint: string; // 未獲得のときに出す「どうすれば取れるか」
  check: (d: AppData) => boolean;
}

const sumAmount = (d: AppData, menuId: string) =>
  d.records.filter((r) => r.menuId === menuId).reduce((s, r) => s + r.amount, 0);
const practiceDays = (d: AppData) => new Set(d.records.map((r) => r.date)).size;
const sumGames = (d: AppData, k: "hits" | "runs" | "steals" | "rbi") =>
  d.games.reduce((s, g) => s + (g[k] || 0), 0);
const careCount = (d: AppData) => d.records.filter((r) => r.menuId.startsWith("care_")).length;
const fieldingCount = (d: AppData) => d.records.filter((r) => r.menuId === "ground").length;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "debut", title: "野球デビュー", desc: "はじめての練習を記録した", icon: "⚾", tier: "bronze", hint: "練習を1回記録する", check: (d) => d.records.length > 0 },
  { id: "first_quiz", title: "ルールの入口", desc: "野球クイズに初挑戦", icon: "❓", tier: "bronze", hint: "クイズを1問とく", check: (d) => d.quiz.length > 0 },
  { id: "swing100", title: "素振り100回", desc: "通算100スイング", icon: "🏏", tier: "bronze", hint: "素振りを合計100回", check: (d) => sumAmount(d, "swing") >= 100 },
  { id: "swing1000", title: "素振り1000回", desc: "通算1000スイング！", icon: "🏏", tier: "silver", hint: "素振りを合計1000回", check: (d) => sumAmount(d, "swing") >= 1000 },
  { id: "swing5000", title: "素振り5000回", desc: "バットが体の一部になってきた", icon: "🏏", tier: "gold", hint: "素振りを合計5000回", check: (d) => sumAmount(d, "swing") >= 5000 },
  { id: "swing10000", title: "素振り1万回", desc: "伝説への第一歩", icon: "🏆", tier: "trophy", hint: "素振りを合計10000回", check: (d) => sumAmount(d, "swing") >= 10000 },
  { id: "days7", title: "練習7日達成", desc: "7日分の練習を記録した", icon: "📅", tier: "bronze", hint: "7日 練習を記録する", check: (d) => practiceDays(d) >= 7 },
  { id: "days30", title: "練習30日達成", desc: "30日分の練習！習慣になってきた", icon: "📅", tier: "silver", hint: "30日 練習を記録する", check: (d) => practiceDays(d) >= 30 },
  { id: "days100", title: "練習100日達成", desc: "100日の積み重ね", icon: "🌟", tier: "gold", hint: "100日 練習を記録する", check: (d) => practiceDays(d) >= 100 },
  { id: "fielding10", title: "守備の基本", desc: "ゴロ捕球を10日 練習した", icon: "🧤", tier: "bronze", hint: "ゴロ捕球を10日 記録する", check: (d) => fieldingCount(d) >= 10 },
  { id: "fielding_master", title: "守備マスター", desc: "ゴロ捕球を50日 練習した", icon: "🧤", tier: "gold", hint: "ゴロ捕球を50日 記録する", check: (d) => fieldingCount(d) >= 50 },
  { id: "care10", title: "道具を大切に", desc: "グローブやスパイクの手入れを10回", icon: "🧤", tier: "bronze", hint: "道具の手入れを10回 記録する", check: (d) => careCount(d) >= 10 },
  { id: "care50", title: "道具の達人", desc: "手入れを50回。道具が一番の相棒", icon: "✨", tier: "silver", hint: "道具の手入れを50回 記録する", check: (d) => careCount(d) >= 50 },
  { id: "rules10", title: "ルールブック読破", desc: "ルールブックを10項目 読んだ", icon: "📖", tier: "bronze", hint: "ルールブックで10項目「読んだ」にする", check: (d) => (d.rulesRead || []).length >= 10 },
  { id: "first_game", title: "初出場", desc: "はじめての試合を記録した", icon: "🏟️", tier: "bronze", hint: "試合を1つ記録する", check: (d) => d.games.length > 0 },
  { id: "first_hit", title: "初ヒット", desc: "試合で初めてのヒット！", icon: "💥", tier: "silver", hint: "試合で安打を記録する", check: (d) => sumGames(d, "hits") >= 1 },
  { id: "first_run", title: "初得点", desc: "ホームを踏んだ！", icon: "🏠", tier: "silver", hint: "試合で得点を記録する", check: (d) => sumGames(d, "runs") >= 1 },
  { id: "first_steal", title: "初盗塁", desc: "周東選手に一歩近づいた", icon: "💨", tier: "silver", hint: "試合で盗塁を記録する", check: (d) => sumGames(d, "steals") >= 1 },
  { id: "first_rbi", title: "初打点", desc: "チームの点を取った！", icon: "🎯", tier: "silver", hint: "試合で打点を記録する", check: (d) => sumGames(d, "rbi") >= 1 },
  { id: "hits10", title: "10安打", desc: "通算10安打", icon: "💥", tier: "gold", hint: "通算10安打", check: (d) => sumGames(d, "hits") >= 10 },
  { id: "quiz_master", title: "ルール博士", desc: "クイズで30問 正解した", icon: "🎓", tier: "gold", hint: "クイズで30問 正解する", check: (d) => d.quiz.filter((q) => q.correct).length >= 30 },
  { id: "lv5", title: "Lv.5 到達", desc: "レベル5になった", icon: "⭐", tier: "bronze", hint: "Lv.5 になる", check: (d) => levelFromXp(totalXp(d)).level >= 5 },
  { id: "lv10", title: "Lv.10 到達", desc: "レベル10になった", icon: "⭐", tier: "silver", hint: "Lv.10 になる", check: (d) => levelFromXp(totalXp(d)).level >= 10 },
  { id: "lv20", title: "Lv.20 到達", desc: "レベル20になった", icon: "🌟", tier: "gold", hint: "Lv.20 になる", check: (d) => levelFromXp(totalXp(d)).level >= 20 },
  { id: "road3", title: "道を進む", desc: "ロードマップの目標を3つ達成", icon: "🛣️", tier: "silver", hint: "ロードマップの目標を3つ達成", check: (d) => d.goals.filter((g) => g.achievedAt).length >= 3 },
  { id: "champion", title: "新人戦優勝", desc: "今年の目標を達成した！！", icon: "🏆", tier: "trophy", hint: "ロードマップ「新人戦で優勝する」を達成", check: (d) => !!d.goals.find((g) => g.id === "g5")?.achievedAt },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
