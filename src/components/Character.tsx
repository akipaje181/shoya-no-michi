"use client";
// オリジナルの野球キャラクター（SVG）。装備アイテムで見た目が変わる
import type { AvatarConfig } from "@/lib/types";
import type { ItemDef } from "@/data/items";

interface Props {
  avatar: AvatarConfig;
  number?: string;
  equipped?: Partial<Record<ItemDef["slot"], ItemDef>>;
  size?: number;
  pose?: "stand" | "swing" | "ready";
  className?: string;
}

export default function Character({ avatar, number, equipped = {}, size = 200, pose = "stand", className }: Props) {
  const skin = avatar.skin;
  const cap = avatar.capColor;
  const uni = equipped.uniform ? equipped.uniform.color : avatar.uniformColor;
  const acc = equipped.uniform?.color2 || avatar.accentColor;
  const bat = equipped.bat;
  const glove = equipped.glove;
  const gloves = equipped.gloves;
  const spikes = equipped.spikes;
  const dark = isDark(uni);
  const numColor = dark ? "#FFFFFF" : acc;

  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} className={className} aria-label="奨也のキャラクター">
      <defs>
        <linearGradient id="chShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {/* 影 */}
      <ellipse cx="100" cy="228" rx="52" ry="8" fill="#000" opacity="0.25" />

      {/* 脚・スパイク */}
      <g>
        <rect x="74" y="160" width="20" height="50" rx="8" fill={uni} />
        <rect x="106" y="160" width="20" height="50" rx="8" fill={uni} />
        <rect x="74" y="160" width="20" height="50" rx="8" fill="url(#chShade)" />
        <rect x="106" y="160" width="20" height="50" rx="8" fill="url(#chShade)" />
        {/* ストッキング */}
        <rect x="76" y="188" width="16" height="22" rx="6" fill={acc} />
        <rect x="108" y="188" width="16" height="22" rx="6" fill={acc} />
        {/* スパイク */}
        <path d="M68 210 h30 a6 6 0 0 1 6 6 v4 h-42 v-4 a6 6 0 0 1 6 -6z" fill={spikes ? spikes.color : "#222"} />
        <path d="M102 210 h30 a6 6 0 0 1 6 6 v4 h-42 v-4 a6 6 0 0 1 6 -6z" fill={spikes ? spikes.color : "#222"} />
        {spikes && (
          <>
            <path d="M70 214 h26" stroke={spikes.color2 || "#fff"} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M104 214 h26" stroke={spikes.color2 || "#fff"} strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* 胴体 */}
      <g>
        <path d="M64 100 q36 -18 72 0 l6 66 q-42 10 -84 0z" fill={uni} />
        <path d="M64 100 q36 -18 72 0 l6 66 q-42 10 -84 0z" fill="url(#chShade)" />
        {/* 前立て・ボタン */}
        <path d="M100 86 v78" stroke={acc} strokeWidth="2" opacity="0.8" />
        <circle cx="100" cy="104" r="2" fill={acc} /><circle cx="100" cy="122" r="2" fill={acc} /><circle cx="100" cy="140" r="2" fill={acc} />
        {/* ラインとロゴ */}
        <path d="M66 112 q34 -12 68 0" stroke={acc} strokeWidth="4" fill="none" />
        <text x="100" y="150" textAnchor="middle" fontFamily="Avenir Next, Arial Black, sans-serif" fontWeight="900" fontSize="26" fill={numColor} stroke={dark ? "none" : "#0C1C35"} strokeWidth="0.6">
          {number || ""}
        </text>
        {/* ベルト */}
        <rect x="66" y="158" width="68" height="8" rx="3" fill="#1a1a1a" />
        <rect x="95" y="157" width="10" height="10" rx="2" fill="#c9c9c9" />
      </g>

      {/* 腕 */}
      <g>
        {/* 左腕（グローブ側） */}
        <path d={pose === "ready" ? "M66 104 q-28 24 -18 56" : "M66 104 q-22 28 -14 60"} stroke={uni} strokeWidth="18" strokeLinecap="round" fill="none" />
        <path d={pose === "ready" ? "M66 104 q-28 24 -18 56" : "M66 104 q-22 28 -14 60"} stroke={acc} strokeWidth="18" strokeLinecap="round" fill="none" strokeDasharray="0 40 60 200" opacity="0.9" />
        {/* グローブ */}
        <g transform={pose === "ready" ? "translate(48 162)" : "translate(52 166)"}>
          <path d="M-16 -4 q0 -22 16 -24 q18 -2 20 16 q2 20 -14 24 q-20 4 -22 -16z" fill={glove ? glove.color : "#8B5A2B"} />
          <path d="M-10 -8 q2 -14 12 -14 M-2 -12 q4 -12 14 -10 M8 -10 q6 -8 12 -2" stroke={glove?.color2 || "#3b2a1a"} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M-8 8 q10 6 20 -2" stroke={glove?.color2 || "#3b2a1a"} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
        </g>
        {/* 右腕（バット側） */}
        <path d={pose === "swing" ? "M134 104 q30 -10 36 20" : "M134 104 q24 26 16 60"} stroke={uni} strokeWidth="18" strokeLinecap="round" fill="none" />
        <path d={pose === "swing" ? "M134 104 q30 -10 36 20" : "M134 104 q24 26 16 60"} stroke={acc} strokeWidth="18" strokeLinecap="round" fill="none" strokeDasharray="0 40 60 200" opacity="0.9" />
        {/* 手（手袋） */}
        <circle cx={pose === "swing" ? 170 : 150} cy={pose === "swing" ? 124 : 164} r="10" fill={gloves ? gloves.color : skin} stroke={gloves?.color2 || "none"} strokeWidth="2" />
        {/* バット */}
        <g transform={pose === "swing" ? "translate(170 124) rotate(-60)" : "translate(150 164) rotate(-20)"}>
          <path d="M-4 0 l2 -64 q2 -8 10 -8 q8 0 10 8 l2 64z" transform="translate(-8 0)" fill={bat ? bat.color : "#C68E4D"} />
          {bat?.color2 && <path d="M-6 -30 l20 0 M-6 -40 l20 0" transform="translate(-8 0)" stroke={bat.color2} strokeWidth="3" />}
          <rect x="-14" y="-4" width="12" height="10" rx="3" fill="#1a1a1a" />
        </g>
      </g>

      {/* 首 */}
      <rect x="90" y="76" width="20" height="18" rx="6" fill={skin} />

      {/* 顔 */}
      <g>
        <ellipse cx="100" cy="56" rx="34" ry="34" fill={skin} />
        {/* 耳 */}
        <circle cx="66" cy="58" r="6" fill={skin} /><circle cx="134" cy="58" r="6" fill={skin} />
        {/* 髪 */}
        {avatar.hair === "short" && <path d="M68 48 q6 -26 32 -28 q26 2 32 28 q-10 -8 -32 -8 q-22 0 -32 8z" fill="#1a1a1a" />}
        {avatar.hair === "spiky" && <path d="M66 50 l6 -22 l8 10 l6 -18 l8 12 l6 -16 l8 14 l6 -12 l6 16 l6 -8 l4 24 q-10 -8 -32 -8 q-22 0 -32 8z" fill="#1a1a1a" />}
        {/* 帽子 */}
        <path d="M64 46 q4 -32 36 -32 q32 0 36 32 z" fill={cap} />
        <path d="M64 46 h72 v4 q-36 6 -72 0z" fill={cap} />
        <path d="M60 50 h80 q6 0 6 4 q0 4 -8 4 h-76 q-8 0 -8 -4 q0 -4 6 -4z" fill={cap} opacity="0.95" />
        <path d="M64 46 q4 -32 36 -32 q32 0 36 32 z" fill="url(#chShade)" />
        <text x="100" y="40" textAnchor="middle" fontFamily="Avenir Next, Arial Black, sans-serif" fontWeight="900" fontSize="16" fill={acc}>S</text>
        {/* 目 */}
        {avatar.eyes === "normal" && (<><ellipse cx="87" cy="62" rx="4" ry="5" fill="#1a1a1a" /><ellipse cx="113" cy="62" rx="4" ry="5" fill="#1a1a1a" /><circle cx="88.5" cy="60" r="1.4" fill="#fff" /><circle cx="114.5" cy="60" r="1.4" fill="#fff" /></>)}
        {avatar.eyes === "sharp" && (<><path d="M80 60 l12 2 l-2 5 l-10 -2z" fill="#1a1a1a" /><path d="M120 60 l-12 2 l2 5 l10 -2z" fill="#1a1a1a" /></>)}
        {avatar.eyes === "happy" && (<><path d="M82 64 q5 -7 10 0" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M108 64 q5 -7 10 0" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" /></>)}
        {/* 眉 */}
        <path d="M81 54 l12 -2" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M119 54 l-12 -2" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
        {/* 口 */}
        <path d="M92 76 q8 7 16 0" stroke="#8a3b2a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* ほほ */}
        <circle cx="78" cy="70" r="4" fill="#f08a7a" opacity="0.4" /><circle cx="122" cy="70" r="4" fill="#f08a7a" opacity="0.4" />
      </g>
    </svg>
  );
}

function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}
