"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Celebration from "./Celebration";
import { IMG, NAV_ICON } from "@/lib/img";
import { Ic } from "./ui";
import { startSync } from "@/lib/sync";

const TABS = [
  { href: "/home", icon: "🏠", label: "ホーム" },
  { href: "/practice", icon: "🎯", label: "ミッション" },
  { href: "/player", icon: "🧢", label: "選手" },
  { href: "/road", icon: "🛣️", label: "道" },
  { href: "/more", icon: "☰", label: "メニュー" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const isOpening = path === "/" || path === "";

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker.register(`${base}/sw.js`).catch(() => undefined);
  }, []);
  useEffect(() => { startSync(); }, []);

  return (
    <>
      <main className={`flex-1 w-full max-w-2xl mx-auto ${isOpening ? "" : "safe-bottom"}`}>{children}</main>
      {!isOpening && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-[var(--navy)]/92 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="max-w-2xl mx-auto grid grid-cols-5">
            {TABS.map((t) => {
              const active = path.startsWith(t.href);
              return (
                <Link key={t.href} href={t.href} className={`flex flex-col items-center justify-center py-2 gap-0.5 text-[11px] font-bold ${active ? "text-lime" : "text-muted"}`}>
                  {t.href === "/player" ? (
                    <img src={IMG.hero.face} alt="" className={`w-7 h-7 rounded-full object-cover object-top bg-navy-3 ${active ? "ring-2 ring-lime scale-110" : "opacity-80"}`} />
                  ) : (
                    <Ic name={NAV_ICON[t.href]} emoji={t.icon} size={30} className={active ? "scale-110 drop-shadow-[0_0_6px_rgba(168,230,108,0.7)]" : "opacity-60"} />
                  )}
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      <Celebration />
    </>
  );
}
