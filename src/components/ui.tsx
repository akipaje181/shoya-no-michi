"use client";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`card p-4 ${onClick ? "tap" : ""} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mt-6 mb-2 px-1">
      <h2 className="font-display text-lg tracking-wide text-white/95">{children}</h2>
      {right}
    </div>
  );
}

export function PageHeader({ title, sub, back, right }: { title: string; sub?: string; back?: string; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 px-4 sticky top-0 z-20 bg-[var(--navy)]/85 backdrop-blur">
      {back && (
        <Link href={back} className="btn btn-ghost btn-sm !min-h-10 !px-3" aria-label="もどる">
          ←
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-xl leading-tight truncate">{title}</h1>
        {sub && <p className="text-xs text-muted truncate">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`bar ${className}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, unit, big }: { label: string; value: ReactNode; unit?: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-black/20 px-2 py-3 min-w-0">
      <div className={`font-display num leading-none ${big ? "text-3xl" : "text-2xl"}`}>
        {value}
        {unit && <span className="text-xs font-sans font-bold text-muted ml-0.5">{unit}</span>}
      </div>
      <div className="text-[11px] text-muted mt-1 font-bold whitespace-nowrap">{label}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[88dvh] overflow-y-auto rounded-b-none sm:rounded-b-[20px] p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] fade-in`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="font-display text-lg">{title}</h3>}
          <button className="btn btn-ghost btn-sm !min-h-9 !px-3 ml-auto" onClick={onClose} aria-label="とじる">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ text = "まだ記録がありません", sub }: { text?: string; sub?: string }) {
  return (
    <div className="text-center py-8 text-muted">
      <div className="text-3xl mb-2">📭</div>
      <div className="font-bold">{text}</div>
      {sub && <div className="text-xs mt-1">{sub}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-3">
      <div className="text-xs font-bold text-muted mb-1">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-muted mt-1">{hint}</div>}
    </label>
  );
}

/** 数の入力：− ＋ と直接入力 */
export function NumberStepper({ value, onChange, step = 1, min = 0, max = 99999, unit, quick }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; quick?: number[] }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost !min-h-12 !w-12 !px-0 text-xl" onClick={() => set(value - step)} aria-label="へらす">−</button>
        <div className="flex-1 flex items-baseline justify-center gap-1 rounded-xl bg-black/25 py-2">
          <input
            type="number"
            inputMode="numeric"
            className="w-24 bg-transparent text-center font-display text-3xl num outline-none"
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => set(Number(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
          />
          {unit && <span className="text-sm text-muted font-bold">{unit}</span>}
        </div>
        <button type="button" className="btn btn-ghost !min-h-12 !w-12 !px-0 text-xl" onClick={() => set(value + step)} aria-label="ふやす">＋</button>
      </div>
      {quick && (
        <div className="flex gap-2 mt-2">
          {quick.map((q) => (
            <button key={q} type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => set(value + q)}>
              +{q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-black/25 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${value === o.v ? "bg-blue text-white shadow" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
