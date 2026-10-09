"use client";
// オープニング画面
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Character from "@/components/Character";
import { useAppData, useHydrated } from "@/lib/store";
import { equippedItems } from "@/components/Avatar";

export default function Opening() {
  const router = useRouter();
  const data = useAppData();
  const hydrated = useHydrated();
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 同じ起動中に2回目は出さない
    try {
      if (sessionStorage.getItem("shoya.opened")) {
        router.replace("/home");
        return;
      }
    } catch { /* ignore */ }
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 1100);
    const t3 = setTimeout(() => setStep(3), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [router]);

  const start = () => {
    try { sessionStorage.setItem("shoya.opened", "1"); } catch { /* ignore */ }
    router.push("/home");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden flex flex-col items-center justify-between text-center select-none" onClick={() => step >= 3 && start()}>
      {/* 球場の背景 */}
      <Stadium />
      <button className="absolute top-[calc(env(safe-area-inset-top,0px)+12px)] right-4 z-10 chip" onClick={(e) => { e.stopPropagation(); start(); }}>
        スキップ ▶
      </button>

      <div className="relative z-10 pt-[18vh] px-6">
        <div className={`transition-all duration-700 ${step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6"}`}>
          <div className="font-display text-lime text-sm tracking-[0.4em]">SHOYA&apos;S ROAD</div>
          <h1 className="font-display text-[56px] leading-none mt-1 drop-shadow-[0_6px_0_rgba(0,0,0,0.45)]">
            奨也<span className="text-blue-2">の</span>道
          </h1>
        </div>
        <p className={`mt-4 text-white/85 font-bold tracking-widest transition-all duration-700 delay-200 ${step >= 2 ? "opacity-100" : "opacity-0"}`}>
          走れ。守れ。打て。夢をつかめ。
        </p>
      </div>

      <div className={`relative z-10 transition-all duration-700 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {hydrated && <Character avatar={data.profile.avatar} number={data.profile.number} equipped={equippedItems(data)} size={190} pose="swing" />}
      </div>

      <div className="relative z-10 w-full px-8 pb-[calc(env(safe-area-inset-bottom,0px)+40px)]">
        <button
          className={`btn btn-primary w-full text-xl tracking-widest font-display transition-all duration-500 ${step >= 3 ? "opacity-100 pulse" : "opacity-0"}`}
          onClick={(e) => { e.stopPropagation(); start(); }}
        >
          ▶ GAME START
        </button>
        <div className="text-[11px] text-muted mt-3">音は「メニュー → 設定」でオンにできます</div>
      </div>
    </div>
  );
}

function Stadium() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <radialGradient id="sky" cx="50%" cy="20%" r="80%">
          <stop offset="0" stopColor="#2a4f93" />
          <stop offset="1" stopColor="#0C1C35" />
        </radialGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f7d3a" />
          <stop offset="1" stopColor="#1d5a28" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#sky)" />
      {/* ナイター照明 */}
      {[60, 340].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="170" width="6" height="160" fill="#1b2d52" />
          <rect x={x - 26} y="150" width="52" height="26" rx="4" fill="#dfe9ff" opacity="0.9" />
          <ellipse cx={x} cy="163" rx="90" ry="40" fill="#fff" opacity="0.08" />
        </g>
      ))}
      {/* スタンド */}
      <path d="M-20 420 q220 -120 440 0 v60 q-220 -90 -440 0z" fill="#17305c" />
      <path d="M-20 440 q220 -110 440 0" stroke="#3b5fa0" strokeWidth="2" fill="none" />
      {[...Array(24)].map((_, i) => (
        <circle key={i} cx={10 + i * 16.5} cy={430 - Math.sin((i / 23) * Math.PI) * 60} r="3" fill={i % 3 ? "#5a7fc4" : "#A8E66C"} opacity="0.6" />
      ))}
      {/* 外野の芝 */}
      <path d="M-50 480 q250 -90 500 0 v400 h-500z" fill="url(#grass)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M-50 ${520 + i * 50} q250 -70 500 0`} stroke="#000" strokeOpacity="0.08" strokeWidth="22" fill="none" />
      ))}
      {/* 内野のダイヤモンド */}
      <path d="M200 520 l130 110 l-130 110 l-130 -110z" fill="#b5844a" />
      <path d="M200 548 l100 82 l-100 82 l-100 -82z" fill="#2f7d3a" />
      <path d="M200 520 l130 110 l-130 110 l-130 -110z" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.9" />
      <rect x="192" y="732" width="16" height="16" fill="#fff" transform="rotate(45 200 740)" />
      <rect x="322" y="622" width="14" height="14" fill="#fff" transform="rotate(45 329 629)" />
      <rect x="64" y="622" width="14" height="14" fill="#fff" transform="rotate(45 71 629)" />
      <rect x="192" y="512" width="14" height="14" fill="#fff" transform="rotate(45 199 519)" />
      <circle cx="200" cy="630" r="18" fill="#b5844a" />
    </svg>
  );
}
