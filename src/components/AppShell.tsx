"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Celebration from "./Celebration";

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
                  <span className={`text-2xl leading-none ${active ? "scale-110" : ""}`}>{t.icon}</span>
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
