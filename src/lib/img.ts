// 画像の URL（GitHub Pages のサブパス対応）
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function img(name: string): string {
  return `${base}/img/${name}`;
}

const MENU_IMG = new Set(["swing", "ground", "catch", "footwork", "running", "stretch", "quiz", "free"]);

export type HeroPose = "stand" | "ready" | "swing" | "cheer" | "run" | "throw" | "rest" | "think" | "face";

export const IMG = {
  openingBg: img("opening-bg.webp"),
  homeHero: img("home-hero.webp"),
  roadBg: img("road-bg.webp"),
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
  medal: { bronze: img("medal-bronze.webp"), silver: img("medal-silver.webp"), gold: img("medal-gold.webp") },
  item: (id: string) => img(`item-${id}.webp`),
};
