"use client";
// オープニング画面
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { IMG } from "@/lib/img";
import { useAppData, useHydrated } from "@/lib/store";

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
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG.openingBg})` }} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C1C35]/70 via-transparent to-[#0C1C35]/80" aria-hidden />
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
        {hydrated && <Avatar data={data} size={230} pose="swing" />}
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
