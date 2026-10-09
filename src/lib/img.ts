// 画像の URL（GitHub Pages のサブパス対応）
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function img(name: string): string {
  return `${base}/img/${name}`;
}

export const IMG = {
  openingBg: img("opening-bg.webp"),
  homeHero: img("home-hero.webp"),
  roadBg: img("road-bg.webp"),
  celebrateBg: img("celebrate-bg.webp"),
  hero: { stand: img("hero-stand.webp"), ready: img("hero-ready.webp"), swing: img("hero-swing.webp") },
  medal: { bronze: img("medal-bronze.webp"), silver: img("medal-silver.webp"), gold: img("medal-gold.webp") },
  item: (id: string) => img(`item-${id}.webp`),
};
