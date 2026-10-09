// 「奨也の道」のデータ型。
// 指示書のテーブル名（player_profiles, practice_menus, ...）に対応させてあり、
// 将来 Supabase に移すときは各型がそのままテーブルの1行になる。

export type ISODate = string; // "2026-10-09"（端末のローカル日付）
export type ISOTime = string; // new Date().toISOString()

export type MenuCategory =
  | "swing" // 素振り・バッティング
  | "fielding" // ゴロ捕球・守備
  | "throwing" // キャッチボール・送球
  | "footwork" // 足さばき
  | "running" // 走塁・ダッシュ
  | "stretch" // ストレッチ・体づくり
  | "quiz" // 野球クイズ
  | "free"; // 自由練習

export type MenuUnit = "count" | "min";

export interface PracticeMenu {
  id: string;
  name: string;
  icon: string; // 絵文字
  category: MenuCategory;
  unit: MenuUnit;
  defaultTarget: number; // 目安（回 or 分）
  xp: number;
  active: boolean; // 今日のミッションに出すか
  order: number;
  builtin?: boolean;
}

export interface Measured {
  catchTry?: number; // ゴロ捕球 試行
  catchOk?: number; // 成功
  throwTry?: number; // 送球 試行
  throwOk?: number;
  run20m?: number; // 20m走 秒
}

export interface PracticeRecord {
  id: string;
  date: ISODate;
  menuId: string;
  amount: number; // 回数 or 分（同じ日の同じメニューは合算）
  memo?: string;
  measured?: Measured;
  createdAt: ISOTime;
  updatedAt: ISOTime;
}

// 二重付与防止: key = `${date}:${menuId}`
export interface MissionCompletion {
  key: string;
  date: ISODate;
  menuId: string;
  xpGranted: number;
  completedAt: ISOTime;
}

export interface XpTransaction {
  id: string;
  date: ISODate;
  amount: number;
  source: string; // "mission" | "quiz" | "weekly" | "bonus" | "game" | "goal"
  label: string;
  uniqueKey: string; // 同じ uniqueKey は2回入らない
  createdAt: ISOTime;
}

export type GameResult = "win" | "lose" | "draw" | "";

export interface GameRecord {
  id: string;
  date: ISODate;
  opponent: string;
  tournament?: string;
  result: GameResult;
  scoreFor?: number;
  scoreAgainst?: number;
  pa: number; // 打席数
  ab: number; // 打数
  hits: number; // 安打
  doubles?: number;
  triples?: number;
  homeruns?: number;
  rbi: number; // 打点
  runs: number; // 得点
  steals: number; // 盗塁
  walks?: number; // 四死球
  position?: string;
  battingOrder?: number;
  goodPlay?: string; // 守備の良かったプレー
  reflection?: string; // 今日の反省
  didWell?: string; // 今日できたこと
  mediaIds: string[];
  createdAt: ISOTime;
  updatedAt: ISOTime;
}

export interface Goal {
  id: string;
  order: number;
  title: string;
  detail?: string;
  achievedAt?: ISODate;
  comment?: string;
  mediaIds: string[];
  builtin?: boolean;
}

export interface Achievement {
  id: string; // 定義は data/achievements.ts
  unlockedAt: ISOTime;
  seen: boolean; // 演出を見たか
}

export interface PlayerInventory {
  itemId: string; // 定義は data/items.ts
  acquiredAt: ISOTime;
  equipped: boolean;
  seen: boolean;
}

export type MediaKind = "photo" | "video";
export type MediaTag = "batting" | "fielding" | "running" | "game" | "memory" | "other";

export interface MediaAsset {
  id: string; // IndexedDB のキー
  kind: MediaKind;
  mime: string;
  size: number;
  date: ISODate;
  tag: MediaTag;
  comment?: string;
  createdAt: ISOTime;
}

export interface QuizAttempt {
  id: string;
  date: ISODate;
  questionId: string;
  choice: number;
  correct: boolean;
  createdAt: ISOTime;
}

export interface EncouragementMessage {
  id: string;
  date: ISODate;
  text: string;
  from: string; // "パパ" など
  readAt?: ISOTime;
  createdAt: ISOTime;
}

export type RewardStatus = "proposed" | "approved" | "done";

export interface Reward {
  id: string;
  title: string; // 焼肉 など
  condition: string; // 「Lv.10 になったら」など
  status: RewardStatus;
  createdAt: ISOTime;
  doneAt?: ISOTime;
}

export type Bats = "R" | "L" | "S";
export type Throws = "R" | "L";

export interface AvatarConfig {
  skin: string; // 肌色
  capColor: string;
  uniformColor: string;
  accentColor: string;
  hair: "short" | "spiky" | "cap-only";
  eyes: "normal" | "sharp" | "happy";
  usePhoto: boolean; // 写真を選手カードに使う
}

export interface PlayerProfile {
  name: string; // 表示名 "SHOYA"
  nameJa: string; // 奨也
  number: string; // 背番号（未定なら ""）
  team?: string;
  grade: string; // 小4
  bats: Bats;
  throws: Throws;
  positions: string[];
  avatar: AvatarConfig;
  photoId?: string; // media id
  favoritePlayer: string;
  dreamText: string;
  goalThisYear: string;
  goalNextYear: string;
  startedAt?: ISODate; // 野球を始めた日
}

export interface XpRules {
  quizPerfect: number;
  quizEach: number;
  weeklyGoal: number; // 週間目標達成
  weeklyGoalDays: number; // 週に何日練習したら達成か
  gameRecord: number; // 試合を記録
  goalAchieved: number; // ロードマップの目標達成
}

export interface Settings {
  xpRules: XpRules;
  parentPin?: string; // 4桁
  sound: boolean;
  openingSeen?: boolean;
  parentName: string; // "パパ"
}

// 育成ステータス（ゲームの値。実測ではない）
export interface GrowthStats {
  meet: number;
  power: number;
  speed: number;
  fielding: number;
  arm: number;
  knowledge: number;
}

export interface RestDay {
  date: ISODate;
}

export interface AppData {
  version: number;
  profile: PlayerProfile;
  settings: Settings;
  menus: PracticeMenu[];
  records: PracticeRecord[];
  completions: MissionCompletion[];
  xp: XpTransaction[];
  games: GameRecord[];
  goals: Goal[];
  achievements: Achievement[];
  inventory: PlayerInventory[];
  media: MediaAsset[];
  quiz: QuizAttempt[];
  messages: EncouragementMessage[];
  rewards: Reward[];
  restDays: RestDay[];
  stats: GrowthStats;
  updatedAt: ISOTime;
}
