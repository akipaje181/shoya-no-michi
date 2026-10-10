// きょうのアドバイスを記録から選ぶ（ルールベース。外部サービスは使わない）
import type { AppData } from "./types";
import { TIPS, TIP_BY_ID, type Tip } from "@/data/coach";
import { addDays, diffDays, today, weekStart } from "./date";
import { upcoming } from "./schedule";
import { careerStats } from "./game";

export interface Picked {
  tip: Tip;
  reason: string; // なぜ今このアドバイスか（記録にもとづく一言）
}

/** その日のアドバイスを最大3つ。理由つき。日によって少し変わる */
export function pickToday(d: AppData, base = today()): Picked[] {
  const out: Picked[] = [];
  const used = new Set<string>();
  const add = (id: string, reason: string) => {
    const t = TIP_BY_ID[id];
    if (!t || used.has(id) || out.length >= 3) return;
    used.add(id);
    out.push({ tip: t, reason });
  };

  // 1. 試合・大会が近い
  const next = upcoming(d, 2, base).find((e) => e.kind === "game" || e.kind === "tournament");
  if (next) {
    const n = diffDays(next.date, base);
    add(n === 0 ? "bt4" : "md2", n === 0 ? `きょうは「${next.title}」。思い切っていこう` : `${n === 1 ? "あした" : "あさって"}は「${next.title}」`);
  }

  // 2. 痛み・投げすぎ（ピッチャーをやる子向け）
  const ws = weekStart(base);
  const throwMin = d.records.filter((r) => r.date >= ws && r.menuId === "catch").reduce((s, r) => s + r.amount, 0);
  if (throwMin >= 90) add("pt3", `今週はキャッチボールが ${throwMin} 分。ケアも大事`);

  // 3. 試合の成績から
  const c = careerStats(d.games);
  if (c.ab >= 8 && c.avg !== null && c.avg < 0.2) add("bt4", `最近の打率 ${c.avg.toFixed(3).replace(/^0/, "")}。まずは初球から`);
  if (c.games >= 3 && c.steals === 0) add("rn1", `${c.games} 試合で盗塁 0。足を活かそう`);

  // 4. 育成ステータスでいちばん低いもの
  const s = d.stats;
  const lowest = (Object.entries(s) as [keyof typeof s, number][]).sort((a, b) => a[1] - b[1])[0]?.[0];
  const byStat: Record<string, string[]> = {
    fielding: ["fd1", "fd2", "fd3"], arm: ["th1", "th2", "th3"], speed: ["rn1", "rn3", "rn2"], meet: ["bt2", "bt5", "bt1"], power: ["bt6", "bt3"], knowledge: ["rn2", "md4"],
  };
  const label: Record<string, string> = { fielding: "守備", arm: "送球", speed: "走力", meet: "ミート", power: "パワー", knowledge: "野球知識" };
  if (lowest && byStat[lowest]) {
    const dayIdx = Math.floor(new Date(base).getTime() / 86400000);
    const list = byStat[lowest];
    add(list[dayIdx % list.length], `いま伸ばしたいのは「${label[lowest]}」`);
  }

  // 5. 練習のかたより
  const recent = d.records.filter((r) => r.date >= addDays(base, -6));
  const swing = recent.filter((r) => r.menuId === "swing").length;
  const field = recent.filter((r) => r.menuId === "ground").length;
  if (swing >= 3 && field === 0) add("fd1", "今週は素振りばかり。守備の日もつくろう");
  const care = recent.filter((r) => r.menuId.startsWith("care_")).length;
  if (recent.length >= 3 && care === 0) add("md2", "今週はまだ道具の手入れをしていない");

  // 6. 休んでいない／休みすぎ
  const days = new Set(recent.map((r) => r.date)).size;
  if (days >= 7) add("bd4", "7日連続で練習。休む日も強くなる日");
  if (days === 0 && d.records.length > 0) add("md3", "今週はまだ記録がない。小さな目標から");

  // 7. 足りなければ日替わりで
  const dayIdx = Math.floor(new Date(base).getTime() / 86400000);
  for (let i = 0; out.length < 3 && i < TIPS.length; i++) {
    const t = TIPS[(dayIdx + i * 7) % TIPS.length];
    add(t.id, "きょうのひとこと");
  }
  return out;
}
