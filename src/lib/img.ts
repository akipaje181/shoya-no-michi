// 画像の URL（GitHub Pages のサブパス対応）
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function img(name: string): string {
  return `${base}/img/${name}`;
}

const MENU_IMG = new Set(["swing", "ground", "catch", "footwork", "running", "stretch", "quiz", "free", "care_glove", "care_spikes", "care_gear"]);
// 絵文字の代わりに出すアイコン（第4弾）。無い名前は null → 絵文字のまま
const ICON_IMG = new Set(["tab-home", "tab-mission", "tab-road", "tab-menu", "nav-schedule", "nav-games", "nav-growth", "nav-trophies", "nav-quiz", "nav-note", "nav-coach", "nav-rules", "nav-album", "nav-history", "event-practice", "cat-body", "rule-manner", "parent-records"]);
/** 画面の項目（href）→ アイコン名 */
export const NAV_ICON: Record<string, string> = { "/home": "tab-home", "/practice": "tab-mission", "/road": "tab-road", "/more": "tab-menu", "/schedule": "nav-schedule", "/games": "nav-games", "/growth": "nav-growth", "/trophies": "nav-trophies", "/quiz": "nav-quiz", "/note": "nav-note", "/coach": "nav-coach", "/rules": "nav-rules", "/album": "nav-album", "/practice/history": "nav-history" };
export const EVENT_ICON: Record<string, string> = { practice: "event-practice", tournament: "nav-trophies" };
export const CAT_IMG: Record<string, string> = { body: "cat-body" };
export const RULE_IMG: Record<string, string> = { manner: "rule-manner" };

export type HeroPose = "stand" | "ready" | "swing" | "cheer" | "run" | "throw" | "rest" | "think" | "face";

export const IMG = {
  openingBg: img("opening-bg.webp"),
  homeHero: img("home-hero.webp"),
  dreamWide: img("dream-wide.webp"), // 夢を見上げる少年（ロードマップの上）
  celebrateBg: img("celebrate-bg.webp"),
  hero: {
    stand: img("hero-stand.webp"), ready: img("hero-ready.webp"), swing: img("hero-swing.webp"),
    cheer: img("hero-cheer.webp"), run: img("hero-run.webp"), throw: img("hero-throw.webp"), rest: img("hero-rest.webp"), think: img("hero-think.webp"), face: img("hero-face.webp"),
  },
  trophy: img("trophy.webp"),
  papa: img("papa.webp"),
  empty: img("empty.webp"),
  allclear: img("allclear.webp"),
  allclearBanner: img("allclear-banner.webp"),
  scene: { cheer: img("scene-cheer.webp"), rest: img("scene-rest.webp"), think: img("scene-think.webp") },
  banner: (name: "games" | "growth" | "album" | "quiz" | "parent") => img(`banner-${name}.webp`),
  goal: (n: number) => img(`goal-${n}.webp`),
  rank: (n: number) => img(`rank-${n}.webp`),
  menu: (id: string) => (MENU_IMG.has(id) ? img(`menu-${id}.webp`) : null),
  ic: (name?: string) => (name && ICON_IMG.has(name) ? img(`${name}.webp`) : null),
  medal: { bronze: img("medal-bronze.webp"), silver: img("medal-silver.webp"), gold: img("medal-gold.webp") },
  item: (id: string) => img(`item-${id}.webp`),
};
