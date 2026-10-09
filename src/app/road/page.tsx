"use client";
import { useRef, useState } from "react";
import { Card, Field, Modal, PageHeader } from "@/components/ui";
import { useMediaUrl } from "@/components/Avatar";
import { useAppData, updateData, useHydrated } from "@/lib/store";
import { achieveGoal, unachieveGoal } from "@/lib/game";
import { celebrateGain } from "@/lib/celebrate";
import { formatJa, nowISO, today, uid } from "@/lib/date";
import { putBlob, shrinkPhoto, validateFile } from "@/lib/media";
import type { Goal } from "@/lib/types";

export default function RoadPage() {
  const data = useAppData();
  const hydrated = useHydrated();
  const [sel, setSel] = useState<Goal | null>(null);
  const [adding, setAdding] = useState(false);
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  const goals = [...data.goals].sort((a, b) => a.order - b.order);
  const doneCount = goals.filter((g) => g.achievedAt).length;
  const currentIdx = goals.findIndex((g) => !g.achievedAt);

  return (
    <div>
      <PageHeader title="夢へのロードマップ" sub={`${doneCount} / ${goals.length} 達成`} right={<button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>＋ 目標</button>} />
      <div className="px-4">
        <Card className="text-center">
          <div className="text-[11px] text-lime font-bold tracking-widest">DREAM</div>
          <div className="font-display text-xl mt-1">{data.profile.dreamText}</div>
        </Card>

        {/* 道 */}
        <div className="relative mt-4 pl-10">
          <div className="absolute left-[18px] top-4 bottom-4 w-[6px] rounded-full bg-black/30" />
          <div className="absolute left-[18px] top-4 w-[6px] rounded-full bg-gradient-to-b from-lime to-blue-2 transition-all" style={{ height: `${goals.length ? Math.max(0, (doneCount / goals.length) * 100) : 0}%` }} />
          <div className="flex flex-col gap-3">
            {goals.map((g, i) => {
              const done = !!g.achievedAt;
              const current = i === currentIdx;
              return (
                <div key={g.id} className="relative">
                  <div className={`absolute -left-[34px] top-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-display border-2 ${done ? "bg-lime text-navy border-lime" : current ? "bg-blue text-white border-blue-2 pulse" : "bg-navy-2 text-muted border-white/20"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <Card className={`${done ? "!border-lime/50" : current ? "!border-blue-2/60" : "opacity-80"}`} onClick={() => setSel(g)}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {current && <div className="chip chip-blue mb-1">いまここ</div>}
                        <div className="font-display text-lg leading-tight">{g.title}</div>
                        {g.detail && <div className="text-xs text-white/75 mt-1">{g.detail}</div>}
                        {done && <div className="text-[11px] text-lime mt-1">🏁 {formatJa(g.achievedAt!, true)} 達成</div>}
                        {g.comment && <div className="text-xs mt-1 text-white/85">💬 {g.comment}</div>}
                      </div>
                      {g.mediaIds.length > 0 && <Thumb id={g.mediaIds[g.mediaIds.length - 1]} />}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-center text-muted text-xs mt-4">⚾ 道は、まだまだ続く</div>
      </div>
      <GoalModal goal={sel} onClose={() => setSel(null)} />
      <AddGoalModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function Thumb({ id }: { id: string }) {
  const url = useMediaUrl(id);
  const data = useAppData();
  const m = data.media.find((x) => x.id === id);
  if (!url) return <div className="w-16 h-16 rounded-xl bg-black/25" />;
  return m?.kind === "video" ? <video src={url} className="w-16 h-16 rounded-xl object-cover" muted playsInline /> : <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover" />;
}

function GoalModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const data = useAppData();
  const [k, setK] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [comment, setComment] = useState("");
  const [date, setDate] = useState(today());
  const fileRef = useRef<HTMLInputElement>(null);
  if (goal && k !== goal.id) { setK(goal.id); setTitle(goal.title); setDetail(goal.detail || ""); setComment(goal.comment || ""); setDate(goal.achievedAt || today()); }
  if (!goal) return null;
  const cur = data.goals.find((g) => g.id === goal.id) || goal;

  const save = () => { updateData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? { ...g, title: title.trim() || g.title, detail: detail.trim(), comment: comment.trim() } : g)) })); onClose(); };
  const achieve = () => {
    let r: ReturnType<typeof achieveGoal> | null = null;
    updateData((d) => { const d2 = { ...d, goals: d.goals.map((g) => (g.id === goal.id ? { ...g, title: title.trim() || g.title, detail: detail.trim() } : g)) }; r = achieveGoal(d2, goal.id, date, comment.trim() || undefined); return r.data; });
    if (r) celebrateGain(r, "目標達成");
    onClose();
  };
  const addMedia = async (f: File) => {
    const v = validateFile(f);
    if (!v.ok) { alert(v.reason); return; }
    const blob = v.kind === "photo" ? await shrinkPhoto(f) : f;
    const id = uid("md");
    await putBlob(id, blob);
    updateData((d) => ({
      ...d,
      media: [...d.media, { id, kind: v.kind, mime: blob.type || f.type, size: blob.size, date: today(), tag: "memory", comment: `目標「${goal.title}」`, createdAt: nowISO() }],
      goals: d.goals.map((g) => (g.id === goal.id ? { ...g, mediaIds: [...g.mediaIds, id] } : g)),
    }));
  };

  return (
    <Modal open={!!goal} onClose={onClose} title={`目標 ${cur.order}`}>
      {cur.achievedAt && <div className="chip chip-lime mb-3">🏁 {formatJa(cur.achievedAt, true)} 達成</div>}
      <Field label="目標"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="くわしく"><textarea className="input" value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
      <Field label="コメント（達成したときの気持ちなど）"><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      {cur.mediaIds.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">{cur.mediaIds.map((id) => <Thumb key={id} id={id} />)}</div>
      )}
      <button className="btn btn-ghost btn-sm w-full mb-3" onClick={() => fileRef.current?.click()}>📷 写真・動画を登録</button>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addMedia(f); e.target.value = ""; }} />
      {!cur.achievedAt ? (
        <>
          <Field label="達成した日"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={save}>保存</button>
            <button className="btn btn-primary flex-1" onClick={achieve}>🏁 達成した！</button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("達成を取り消しますか？")) { updateData((d) => unachieveGoal(d, goal.id)); onClose(); } }}>取り消す</button>
          <button className="btn btn-primary flex-1" onClick={save}>保存</button>
        </div>
      )}
      {!cur.builtin && (
        <button className="btn btn-danger btn-sm w-full mt-3" onClick={() => { if (confirm("この目標を消しますか？")) { updateData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== goal.id) })); onClose(); } }}>この目標を消す</button>
      )}
    </Modal>
  );
}

function AddGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [pos, setPos] = useState<"end" | "beforeLast">("beforeLast");
  return (
    <Modal open={open} onClose={onClose} title="目標を追加">
      <Field label="目標"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：レギュラーになる" /></Field>
      <Field label="くわしく"><textarea className="input" value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
      <Field label="どこに入れる">
        <div className="flex gap-2">
          <button className={`chip !text-sm !px-3 !py-2 ${pos === "beforeLast" ? "chip-lime" : ""}`} onClick={() => setPos("beforeLast")}>夢の手前</button>
          <button className={`chip !text-sm !px-3 !py-2 ${pos === "end" ? "chip-lime" : ""}`} onClick={() => setPos("end")}>いちばん最後</button>
        </div>
      </Field>
      <button className="btn btn-primary w-full" disabled={!title.trim()} onClick={() => {
        updateData((d) => {
          const sorted = [...d.goals].sort((a, b) => a.order - b.order);
          const g: Goal = { id: uid("g"), order: 0, title: title.trim(), detail: detail.trim(), mediaIds: [] };
          if (pos === "end" || sorted.length === 0) sorted.push(g); else sorted.splice(sorted.length - 1, 0, g);
          return { ...d, goals: sorted.map((x, i) => ({ ...x, order: i + 1 })) };
        });
        setTitle(""); setDetail(""); onClose();
      }}>追加</button>
    </Modal>
  );
}
