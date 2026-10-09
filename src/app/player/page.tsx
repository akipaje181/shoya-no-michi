"use client";
import { useRef, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import Avatar, { equippedItems, useMediaUrl } from "@/components/Avatar";
import Character from "@/components/Character";
import { Card, Field, Modal, PageHeader, RankBadge, Segmented, Stat } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { levelFromXp, totalXp } from "@/lib/level";
import { careerStats, fmtAvg, practiceDays } from "@/lib/game";
import { putBlob, shrinkPhoto, validateFile } from "@/lib/media";
import { nowISO, today, uid } from "@/lib/date";
import type { AvatarConfig, Bats, Throws } from "@/lib/types";
import { SLOT_LABEL, type ItemSlot } from "@/data/items";
import { IMG } from "@/lib/img";

const STAT_LABEL: Record<string, string> = { meet: "ミート", power: "パワー", speed: "走力", fielding: "守備", arm: "送球", knowledge: "野球知識" };

export default function PlayerPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [edit, setEdit] = useState(false);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  const lv = levelFromXp(totalXp(data));
  const p = data.profile;
  const radar = Object.entries(data.stats).map(([k, v]) => ({ k: STAT_LABEL[k], v: Math.round(v) }));
  const eq = equippedItems(data);
  const career = careerStats(data.games);
  const runs = data.records.map((r) => r.measured?.run20m).filter((v): v is number => !!v);
  const best20 = runs.length ? Math.min(...runs) : null;
  const catchTry = data.records.reduce((s, r) => s + (r.measured?.catchTry || 0), 0);
  const catchOk = data.records.reduce((s, r) => s + (r.measured?.catchOk || 0), 0);
  const throwTry = data.records.reduce((s, r) => s + (r.measured?.throwTry || 0), 0);
  const throwOk = data.records.reduce((s, r) => s + (r.measured?.throwOk || 0), 0);

  return (
    <div>
      <PageHeader title="マイ選手" sub="選手カード" right={<button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>✏️ 編集</button>} />
      <div className="px-4">
        {/* 選手カード */}
        <div className="card relative overflow-hidden p-0" style={{ backgroundImage: `linear-gradient(180deg, rgba(12,28,53,0.35), rgba(12,28,53,0.85) 70%, #13294d), url(${IMG.homeHero})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute top-3 left-4 font-display text-[10px] tracking-[0.3em] text-lime">SHOYA&apos;S ROAD / PLAYER CARD</div>
          <div className="absolute top-2 right-3"><RankBadge level={lv.level} size={34} /></div>
          <div className="flex items-end gap-2 pt-10 px-4">
            <div className="shrink-0 -mb-2"><Avatar data={data} size={150} pose="ready" /></div>
            <div className="flex-1 pb-4 min-w-0">
              <div className="font-display text-4xl leading-none">{p.name}</div>
              <div className="text-sm text-white/80 mt-1">{p.nameJa} {p.grade}{p.team ? ` / ${p.team}` : ""}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {p.number && <span className="chip chip-lime">#{p.number}</span>}
                <span className="chip">{p.bats === "R" ? "右打" : p.bats === "L" ? "左打" : "両打"}・{p.throws === "R" ? "右投" : "左投"}</span>
                {p.positions.map((x) => <span key={x} className="chip chip-blue">{x}</span>)}
              </div>
              <div className="mt-2 font-display text-xl">Lv.<span className="text-lime text-2xl">{lv.level}</span> <span className="text-xs text-muted font-sans">総XP {lv.total}</span></div>
            </div>
          </div>
          <div className="bg-black/30 px-4 py-3 flex items-center gap-3">
            <div className="w-full h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="62%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.15)" />
                  <PolarAngleAxis dataKey="k" tick={{ fill: "#cfe0ff", fontSize: 11, fontWeight: 700 }} />
                  <Radar dataKey="v" stroke="#A8E66C" fill="#A8E66C" fillOpacity={0.45} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs w-28 shrink-0">
              {radar.map((r) => (
                <div key={r.k} className="flex justify-between"><span className="text-muted">{r.k}</span><b className="num text-lime">{r.v}</b></div>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 text-[10px] text-muted">※ ゲームの育成ステータス（練習で上がる）。実際の力の測定値ではありません。</div>
        </div>

        {/* 装備 */}
        <div className="font-display text-lg mt-5 mb-2 px-1">🎒 装備中</div>
        <div className="grid grid-cols-5 gap-1">
          {(Object.keys(SLOT_LABEL) as ItemSlot[]).map((s) => {
            const it = eq[s];
            return (
              <div key={s} className="rounded-xl bg-black/25 p-2 text-center">
                <div className="h-10 flex items-center justify-center">{it ? <img src={IMG.item(it.id)} alt="" className="h-10 w-10 object-contain" /> : <span className="text-muted">—</span>}</div>
                <div className="text-[10px] text-muted">{SLOT_LABEL[s]}</div>
                <div className="text-[10px] font-bold truncate">{it ? it.name : "なし"}</div>
              </div>
            );
          })}
        </div>

        {/* 実測 */}
        <div className="font-display text-lg mt-5 mb-2 px-1">📏 実測の記録 <span className="text-xs text-muted font-sans">（本当に測った数字）</span></div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="20m走ベスト" value={best20 !== null ? best20.toFixed(2) : "---"} unit={best20 !== null ? "秒" : undefined} />
          <Stat label="捕球成功率" value={catchTry ? `${Math.round((catchOk / catchTry) * 100)}` : "---"} unit={catchTry ? "%" : undefined} />
          <Stat label="送球成功率" value={throwTry ? `${Math.round((throwOk / throwTry) * 100)}` : "---"} unit={throwTry ? "%" : undefined} />
          <Stat label="練習した日" value={practiceDays(data)} unit="日" />
          <Stat label="通算素振り" value={data.records.filter((r) => r.menuId === "swing").reduce((s, r) => s + r.amount, 0)} unit="回" />
          <Stat label="打率" value={fmtAvg(career.avg)} />
        </div>
        <p className="text-[11px] text-muted mt-2 px-1">測っていない項目は「---」。ミッションの「実測を入れる」や試合記録から集計します。</p>

        <Card className="mt-4">
          <div className="text-[11px] font-bold text-lime">⭐ 憧れの選手</div>
          <div className="font-bold">{p.favoritePlayer}</div>
          <div className="text-[11px] font-bold text-lime mt-3">🌟 夢</div>
          <div className="font-bold">{p.dreamText}</div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div className="rounded-xl bg-black/20 p-2"><div className="text-[10px] text-muted">今年の目標</div><b>{p.goalThisYear}</b></div>
            <div className="rounded-xl bg-black/20 p-2"><div className="text-[10px] text-muted">1年後</div><b>{p.goalNextYear}</b></div>
          </div>
        </Card>
      </div>
      <EditProfile open={edit} onClose={() => setEdit(false)} />
    </div>
  );
}

const SKINS = ["#F3C9A4", "#E8B48C", "#D39A6E", "#B57B50", "#FBE0C8"];
const CAPS = ["#0C1C35", "#247BDE", "#A8E66C", "#111111", "#E5484D", "#E8B923"];
const UNIS = ["#FFFFFF", "#0C1C35", "#247BDE", "#A8E66C", "#F2F2F2", "#111111"];
const ACCS = ["#247BDE", "#A8E66C", "#E5484D", "#E8B923", "#0C1C35", "#FFFFFF"];
const POSITIONS = ["投", "捕", "一", "二", "三", "遊", "左", "中", "右"];

function EditProfile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppData();
  const [p, setP] = useState(data.profile);
  const [k, setK] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoUrl = useMediaUrl(p.photoId);
  if (open && !k) { setK(true); setP(data.profile); }
  if (!open && k) setK(false);
  const av = (patch: Partial<AvatarConfig>) => setP({ ...p, avatar: { ...p.avatar, ...patch } });

  const pickPhoto = async (f: File) => {
    const v = validateFile(f);
    if (!v.ok) { alert(v.reason); return; }
    if (v.kind !== "photo") { alert("写真を選んでください"); return; }
    const blob = await shrinkPhoto(f);
    const id = uid("ph");
    await putBlob(id, blob);
    updateData((d) => ({ ...d, media: [...d.media, { id, kind: "photo", mime: blob.type || f.type, size: blob.size, date: today(), tag: "memory", comment: "選手の写真", createdAt: nowISO() }] }));
    setP({ ...p, photoId: id, avatar: { ...p.avatar, usePhoto: true, style: "photo" } });
  };

  return (
    <Modal open={open} onClose={onClose} title="選手を編集">
      <div className="flex justify-center mb-3">
        <Character avatar={p.avatar} number={p.number} equipped={equippedItems(data)} size={130} />
      </div>
      <Field label="カードに使う" hint="キャラクターは、手に入れたバットやグローブが反映されます"><Segmented value={p.avatar.style || "hero"} options={[{ v: "hero" as const, label: "イラスト" }, { v: "chara" as const, label: "キャラクター" }, { v: "photo" as const, label: "写真" }]} onChange={(v) => av({ style: v, usePhoto: v === "photo" })} /></Field>
      <div className="flex items-center gap-3 mb-3">
        {photoUrl ? <img src={photoUrl} alt="" className="w-16 h-20 object-cover rounded-xl border-2 border-lime" /> : <div className="w-16 h-20 rounded-xl bg-black/25 flex items-center justify-center text-2xl">📷</div>}
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>写真をえらぶ</button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(f); e.target.value = ""; }} />
      </div>
      <Field label="肌の色"><ColorRow colors={SKINS} value={p.avatar.skin} onChange={(c) => av({ skin: c })} /></Field>
      <Field label="帽子の色"><ColorRow colors={CAPS} value={p.avatar.capColor} onChange={(c) => av({ capColor: c })} /></Field>
      <Field label="ユニフォームの色"><ColorRow colors={UNIS} value={p.avatar.uniformColor} onChange={(c) => av({ uniformColor: c })} /></Field>
      <Field label="ラインの色"><ColorRow colors={ACCS} value={p.avatar.accentColor} onChange={(c) => av({ accentColor: c })} /></Field>
      <Field label="髪型"><Segmented value={p.avatar.hair} options={[{ v: "short", label: "ショート" }, { v: "spiky", label: "ツンツン" }, { v: "cap-only", label: "帽子だけ" }]} onChange={(v) => av({ hair: v })} /></Field>
      <Field label="目"><Segmented value={p.avatar.eyes} options={[{ v: "normal", label: "ふつう" }, { v: "sharp", label: "するどい" }, { v: "happy", label: "にこにこ" }]} onChange={(v) => av({ eyes: v })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="背番号"><input className="input" value={p.number} inputMode="numeric" maxLength={3} onChange={(e) => setP({ ...p, number: e.target.value.replace(/\D/g, "") })} placeholder="未定なら空欄" /></Field>
        <Field label="チーム名"><input className="input" value={p.team || ""} onChange={(e) => setP({ ...p, team: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="打席"><Segmented value={p.bats} options={[{ v: "R" as Bats, label: "右" }, { v: "L" as Bats, label: "左" }, { v: "S" as Bats, label: "両" }]} onChange={(v) => setP({ ...p, bats: v })} /></Field>
        <Field label="投げる手"><Segmented value={p.throws} options={[{ v: "R" as Throws, label: "右" }, { v: "L" as Throws, label: "左" }]} onChange={(v) => setP({ ...p, throws: v })} /></Field>
      </div>
      <Field label="ポジション（複数OK）">
        <div className="flex flex-wrap gap-1">
          {POSITIONS.map((x) => (
            <button key={x} type="button" className={`chip !text-sm !px-3 !py-1.5 ${p.positions.includes(x) ? "chip-lime" : ""}`} onClick={() => setP({ ...p, positions: p.positions.includes(x) ? p.positions.filter((y) => y !== x) : [...p.positions, x] })}>{x}</button>
          ))}
        </div>
      </Field>
      <Field label="憧れの選手"><input className="input" value={p.favoritePlayer} onChange={(e) => setP({ ...p, favoritePlayer: e.target.value })} /></Field>
      <Field label="夢"><input className="input" value={p.dreamText} onChange={(e) => setP({ ...p, dreamText: e.target.value })} /></Field>
      <Field label="今年の目標"><input className="input" value={p.goalThisYear} onChange={(e) => setP({ ...p, goalThisYear: e.target.value })} /></Field>
      <Field label="1年後の目標"><input className="input" value={p.goalNextYear} onChange={(e) => setP({ ...p, goalNextYear: e.target.value })} /></Field>
      <button className="btn btn-primary w-full" onClick={() => { updateData((d) => ({ ...d, profile: p })); onClose(); }}>保存</button>
    </Modal>
  );
}

function ColorRow({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2">
      {colors.map((c) => (
        <button key={c} type="button" aria-label={c} onClick={() => onChange(c)} className={`w-9 h-9 rounded-full border-2 ${value === c ? "border-lime scale-110" : "border-white/20"}`} style={{ background: c }} />
      ))}
    </div>
  );
}
