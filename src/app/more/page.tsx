"use client";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { useAppData, updateData, useHydrated } from "@/lib/store";

// 各画面の「いつ使う・どう使う」。小4本人が読める言葉で書く
interface Item {
  href: string;
  icon: string;
  label: string;
  when: string; // いつ使う（1行）
  steps: string[]; // つかいかた
  tips?: string[]; // ちょっとしたコツ
  parent?: boolean; // 保護者用
}

const TABS: Item[] = [
  {
    href: "/home", icon: "🏠", label: "ホーム",
    when: "毎日さいしょに開く画面",
    steps: ["今日のミッションを確認する", "レベルと XP（けいけんち）を見る", "パパからの応援メッセージを読む", "次にもらえるアイテムをチェック"],
  },
  {
    href: "/practice", icon: "🎯", label: "ミッション",
    when: "練習したら、その日のうちに記録する",
    steps: ["練習したメニュー（素振りなど）をタップ", "やった回数や時間を入れる（＋ボタンでかんたん）", "「ミッション達成！」を押すと XP がもらえる"],
    tips: ["同じミッションの XP は1日1回。追加でやった分は回数に足される", "休みの日は「きょうは休養日にする」を押す（れんぞく記録が続く）", "ゴロ捕球・送球・走塁は「実測を入れる」で成功数やタイムも残せる"],
  },
  {
    href: "/player", icon: "🧢", label: "選手",
    when: "自分の選手カードを見たい・直したいとき",
    steps: ["6つの能力（ミート・パワー・走力・守備・送球・野球知識）のレーダーを見る", "装備中のバットやグローブを見る", "右上の「✏️ 編集」で背番号・チーム名・ポジション・写真を入れる"],
    tips: ["能力は練習すると少しずつ上がる（ゲームの数字）", "「カードに使う」でイラスト／キャラクター／写真を選べる"],
  },
  {
    href: "/road", icon: "🛣️", label: "道（夢へのロードマップ）",
    when: "目標を達成したとき・目標を見直すとき",
    steps: ["目標をタップして開く", "できたら「🏁 達成した！」を押す（XP がもらえる）", "写真や動画、そのときの気持ちをコメントに残す"],
    tips: ["「＋ 目標」で自分の目標を足せる", "いちばん上の夢は「選手 → 編集」で変えられる"],
  },
];

const ITEMS: Item[] = [
  {
    href: "/games", icon: "🏟️", label: "試合記録",
    when: "試合が終わったあとに",
    steps: ["「＋ 試合」を押す", "相手・結果・打数・安打・打点・盗塁などを入れる", "守備の良かったプレー、できたこと、次はこうする、を書く", "保存すると XP がもらえる"],
    tips: ["打率・出塁率・通算成績は自動で計算される", "初ヒット・初盗塁などのメダルは試合記録から判定される"],
  },
  {
    href: "/growth", icon: "📈", label: "成長グラフ",
    when: "どれだけ上手くなったか数字で見たいとき",
    steps: ["期間（7日・30日・3か月・1年）を選ぶ", "見たいもの（素振り回数・練習時間・捕球成功率・20m走…）を選ぶ"],
    tips: ["捕球成功率・送球成功率・20m走は、ミッションの「実測を入れる」で記録したものが出る", "安打数・盗塁数は試合記録から"],
  },
  {
    href: "/trophies", icon: "🏅", label: "メダル・アイテム",
    when: "集めたものを見たいとき・装備を変えたいとき",
    steps: ["「メダル」で取ったメダルと、取り方のヒントを見る", "「アイテム」でレベルアップで手に入れたバット・グローブなどを見る", "アイテムをタップすると装備できる"],
    tips: ["装備はキャラクター（選手 → 編集 →「キャラクター」）の絵に反映される"],
  },
  {
    href: "/quiz", icon: "❓", label: "野球クイズ",
    when: "毎日3問、ルールや守備・走塁の判断を覚える",
    steps: ["A・B・C から答えを選ぶ", "正解でも不正解でも、解説を読む", "3問とも正解するとボーナス XP"],
    tips: ["日付が変わると新しい問題になる", "まちがえても、ペナルティはなし"],
  },
  {
    href: "/album", icon: "🎬", label: "動画アルバム",
    when: "バッティングや守備の動画・思い出の写真をためる",
    steps: ["「＋ 追加」で動画や写真を選ぶ", "種類（バッティング・守備・走塁・試合・思い出）とコメントを入れる", "「🔁 2つをくらべる」で前の動画と今の動画を並べて見る"],
    tips: ["動画はこの端末の中にだけ保存される（ネットには上がらない）", "容量が大きい動画は保存できないことがある（200MBまで）"],
  },
  {
    href: "/practice/history", icon: "📅", label: "練習の履歴",
    when: "いつ何をやったか、カレンダーで見返す",
    steps: ["月を ◀ ▶ で動かす", "日をタップすると、その日の記録が下に出る", "記録をタップすると回数やメモを直せる"],
    tips: ["● は練習した日、⚾ は試合の日、休 は休養日"],
  },
  {
    href: "/parent", icon: "👨", label: "パパの応援（保護者用）", parent: true,
    when: "パパが使う画面。4けたの PIN で開く",
    steps: ["💬 応援：メッセージを送る（ホームに表示される）", "📋 記録：練習の記録を確認する", "🍖 ご褒美：焼肉などの約束を登録・達成にする", "🎯 メニュー：練習メニューの目安・XP を変える、メニューを足す", "⚙️ XP設定：クイズや週間目標の XP、PIN を変える", "💾 データ：バックアップの書き出し・読み込み"],
    tips: ["記録はこの端末の中だけ。ときどき「書き出す」でバックアップを"],
  },
];

function Guide({ item }: { item: Item }) {
  return (
    <details className="card p-0 overflow-hidden group">
      <summary className="list-none p-4 flex items-center gap-3 tap cursor-pointer">
        <span className="text-2xl w-10 text-center shrink-0">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold flex items-center gap-2">
            {item.label}
            {item.parent && <span className="chip chip-gold !text-[10px]">保護者</span>}
          </div>
          <div className="text-xs text-muted">{item.when}</div>
        </div>
        <span className="text-muted text-sm transition group-open:rotate-90">›</span>
      </summary>
      <div className="px-4 pb-4 -mt-1">
        <div className="text-[11px] font-bold text-lime mb-1">つかいかた</div>
        <ol className="text-sm text-white/90 space-y-1.5">
          {item.steps.map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-lime text-navy text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {item.tips && (
          <>
            <div className="text-[11px] font-bold text-blue-2 mt-3 mb-1">コツ・ちゅうい</div>
            <ul className="text-xs text-white/80 space-y-1 pl-5 list-disc">
              {item.tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </>
        )}
        <Link href={item.href} className="btn btn-blue btn-sm w-full mt-3">{item.icon} {item.label.replace(/（.*）/, "")} を開く →</Link>
      </div>
    </details>
  );
}

export default function MorePage() {
  const data = useAppData();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="p-6 text-muted">読み込み中…</div>;
  return (
    <div>
      <PageHeader title="メニュー・つかいかた" sub="タップすると、つかいかたが開きます" />
      <div className="px-4 flex flex-col gap-2">
        <div className="font-display text-base mt-1 px-1">📱 下のタブ</div>
        {TABS.map((it) => <Guide key={it.href} item={it} />)}

        <div className="font-display text-base mt-4 px-1">📂 そのほかの画面</div>
        {ITEMS.map((it) => <Guide key={it.href} item={it} />)}

        <div className="font-display text-base mt-4 px-1">🎮 XP とレベルのしくみ</div>
        <Card>
          <ul className="text-sm text-white/90 space-y-1.5 pl-5 list-disc">
            <li>ミッションをクリアすると XP がたまり、100 XP でレベルアップ（レベルが上がるほど少し多く必要）</li>
            <li>レベルが上がると、新しいバット・グローブ・手袋・スパイク・ユニフォームが手に入る</li>
            <li>称号は 新入部員 → 準レギュラー → レギュラー → チームの主力 → 最強の選手 → レジェンド → 殿堂入り選手 → プロ野球選手</li>
            <li>週に {data.settings.xpRules.weeklyGoalDays} 日 練習すると週間目標ボーナス +{data.settings.xpRules.weeklyGoal} XP</li>
            <li>できなかった日があっても、ペナルティはなし。また今日から！</li>
          </ul>
        </Card>

        <div className="font-display text-base mt-4 px-1">⚙️ 設定</div>
        <Card>
          <label className="flex items-center justify-between py-2">
            <div><div className="font-bold text-sm">効果音</div><div className="text-xs text-muted">XP やレベルアップのときに音を鳴らす</div></div>
            <button className={`w-14 h-8 rounded-full relative transition ${data.settings.sound ? "bg-lime" : "bg-white/20"}`} onClick={() => updateData((d) => ({ ...d, settings: { ...d.settings, sound: !d.settings.sound } }))} aria-label="効果音">
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition ${data.settings.sound ? "left-7" : "left-1"}`} />
            </button>
          </label>
          <Link href="/" className="btn btn-ghost btn-sm w-full mt-2" onClick={() => { try { sessionStorage.removeItem("shoya.opened"); } catch { /* ignore */ } }}>▶ オープニングをもう一度見る</Link>
        </Card>

        <div className="font-display text-base mt-4 px-1">🆘 こまったとき</div>
        <Card>
          <ul className="text-sm text-white/90 space-y-1.5 pl-5 list-disc">
            <li><b>記録はどこに？</b> この iPhone / iPad の中だけ。ネットには送られない</li>
            <li><b>別の端末でも見たい</b> パパの応援 → 💾 データ → 「書き出す」→ もう一方で「読み込む」</li>
            <li><b>画面が古いまま</b> アプリを一度閉じて、開き直す</li>
            <li><b>ホーム画面に置きたい</b> Safari の共有ボタン → 「ホーム画面に追加」</li>
            <li><b>PIN を忘れた</b> バックアップがあれば「読み込む」で戻せる。なければパパに相談</li>
          </ul>
          <div className="text-[11px] text-muted mt-3">奨也の道 SHOYA&apos;S ROAD v0.5</div>
        </Card>
      </div>
    </div>
  );
}
