// 初期データ（練習メニュー・ロードマップ・応援メッセージ・設定）
import type { AppData, Goal, PracticeMenu, PlayerProfile, Settings, GrowthStats } from "@/lib/types";

export const DATA_VERSION = 1;
export const STORAGE_KEY = "shoya.road.v1";

export const DEFAULT_MENUS: PracticeMenu[] = [
  { id: "swing", name: "素振り", icon: "🏏", category: "swing", unit: "count", defaultTarget: 50, xp: 30, active: true, order: 1, builtin: true },
  { id: "ground", name: "ゴロ捕球", icon: "🧤", category: "fielding", unit: "count", defaultTarget: 30, xp: 40, active: true, order: 2, builtin: true },
  { id: "catch", name: "キャッチボール", icon: "⚾", category: "throwing", unit: "min", defaultTarget: 15, xp: 30, active: true, order: 3, builtin: true },
  { id: "footwork", name: "足さばき", icon: "👟", category: "footwork", unit: "min", defaultTarget: 10, xp: 30, active: true, order: 4, builtin: true },
  { id: "running", name: "走塁", icon: "🏃", category: "running", unit: "count", defaultTarget: 10, xp: 30, active: true, order: 5, builtin: true },
  { id: "stretch", name: "ストレッチ", icon: "🧘", category: "stretch", unit: "min", defaultTarget: 10, xp: 15, active: true, order: 6, builtin: true },
  { id: "quiz", name: "野球クイズ", icon: "❓", category: "quiz", unit: "count", defaultTarget: 3, xp: 20, active: true, order: 7, builtin: true },
  { id: "free", name: "自由練習", icon: "✨", category: "free", unit: "min", defaultTarget: 20, xp: 20, active: true, order: 8, builtin: true },
];

export const DEFAULT_GOALS: Goal[] = [
  { id: "g1", order: 1, title: "野球を始める", detail: "チームに入って、グローブとバットを持った。ここからスタート！", mediaIds: [], builtin: true },
  { id: "g2", order: 2, title: "守備の基本を覚える", detail: "ゴロの捕り方、構え、足の運び。毎日のゴロ捕球で身につける。", mediaIds: [], builtin: true },
  { id: "g3", order: 3, title: "初ヒットを打つ", detail: "試合で初めてのヒット。素振りの積み重ねが実る日。", mediaIds: [], builtin: true },
  { id: "g4", order: 4, title: "走塁を上達させる", detail: "スタート、リード、スライディング。周東選手みたいな走りへ。", mediaIds: [], builtin: true },
  { id: "g5", order: 5, title: "新人戦で優勝する", detail: "今年の目標。チームのみんなと優勝をつかむ！", mediaIds: [], builtin: true },
  { id: "g6", order: 6, title: "周東選手のような選手を目指す", detail: "足が速くて、守備が上手くて、バッティングも上手い選手に。", mediaIds: [], builtin: true },
  { id: "g7", order: 7, title: "プロ野球選手という夢に挑戦する", detail: "奨也の道は、ここへ続いている。", mediaIds: [], builtin: true },
];

export const DEFAULT_PROFILE: PlayerProfile = {
  name: "SHOYA",
  nameJa: "奨也",
  number: "",
  team: "",
  grade: "小学4年",
  bats: "R",
  throws: "R",
  positions: [],
  avatar: {
    skin: "#F3C9A4",
    capColor: "#0C1C35",
    uniformColor: "#FFFFFF",
    accentColor: "#247BDE",
    hair: "short",
    eyes: "normal",
    usePhoto: false,
    style: "hero",
  },
  favoritePlayer: "周東佑京（福岡ソフトバンクホークス）",
  dreamText: "周東選手のような、足が速くて守備が上手なプロ野球選手になる",
  goalThisYear: "新人戦で優勝する",
  goalNextYear: "守備が上手になっている",
};

export const DEFAULT_SETTINGS: Settings = {
  xpRules: {
    quizPerfect: 20,
    quizEach: 5,
    weeklyGoal: 100,
    weeklyGoalDays: 4,
    gameRecord: 30,
    goalAchieved: 150,
  },
  sound: false,
  parentName: "パパ",
};

export const DEFAULT_STATS: GrowthStats = {
  meet: 10,
  power: 10,
  speed: 12,
  fielding: 8,
  arm: 8,
  knowledge: 5,
};

// 応援メッセージが無い日に出す定型（パパからの応援は messages が優先）
export const DAILY_CHEERS: string[] = [
  "きょうも一歩。奨也の道は続いている！",
  "素振り1回が、いつかのヒットになる。",
  "守備がうまい選手は、毎日ゴロを捕っている。",
  "周東選手も、最初は小学生だった。",
  "走れ。守れ。打て。夢をつかめ。",
  "きのうの自分より、ちょっと上手くなろう。",
  "グラウンドで一番声を出す選手になろう！",
  "うまくいかない日も、練習した日は前に進んでいる。",
  "足が速い選手は、スタートが速い。今日も1本！",
  "新人戦優勝へ。チームのために、今日の練習。",
  "バットを振った数だけ、強くなる。",
  "いいプレーは、いい準備から。ストレッチも大事！",
  "夢は大きく、練習はコツコツ。",
  "きょうのミッション、クリアしていこう！",
];

export function makeDefaultData(nowISO: string): AppData {
  return {
    version: DATA_VERSION,
    profile: DEFAULT_PROFILE,
    settings: DEFAULT_SETTINGS,
    menus: DEFAULT_MENUS,
    records: [],
    completions: [],
    xp: [],
    games: [],
    goals: DEFAULT_GOALS,
    achievements: [],
    inventory: [],
    media: [],
    quiz: [],
    messages: [],
    rewards: [],
    restDays: [],
    events: [],
    stats: DEFAULT_STATS,
    updatedAt: nowISO,
  };
}
