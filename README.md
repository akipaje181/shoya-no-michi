# 奨也の道 — SHOYA'S ROAD

走れ。守れ。打て。夢をつかめ。
小学4年生の少年野球選手「奨也」専用の、野球育成ゲーム風 練習記録アプリ（PWA）。

- 設計：[docs/設計.md](docs/設計.md)　進捗：[docs/進捗.md](docs/進捗.md)　指示書：[docs/開発指示書.md](docs/開発指示書.md)
- 技術：Next.js 16（静的書き出し）・TypeScript・Tailwind v4・Recharts・PWA
- データ：端末の中（localStorage ＋ 写真・動画は IndexedDB）。外部送信なし。APIキー不要・0円

## 画面

| パス | 画面 |
|---|---|
| `/` | オープニング（GAME START） |
| `/home` | ホーム（キャラ・Lv・XP・今日のミッション・応援・目標） |
| `/player` | マイ選手（選手カード・育成ステータス・実測・キャラ編集・写真） |
| `/practice` | 毎日の練習ミッション（回数・時間入力 → XP） |
| `/practice/history` | 練習の履歴（カレンダー） |
| `/growth` | 成長グラフ（8種類・7日/30日/3か月/1年） |
| `/games` | 試合記録・通算成績 |
| `/album` | 動画アルバム（2本くらべる） |
| `/quiz` | 野球クイズ（1日3問） |
| `/trophies` | メダル・アイテム（装備） |
| `/road` | 夢へのロードマップ |
| `/parent` | パパの応援（PIN。応援・記録・ご褒美・メニュー・XP設定・バックアップ） |
| `/more` | メニュー・設定・つかいかた |

## 開発

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build      # out/ に静的ファイル
```

Claude Code の Browser で確認するときは `.claude/launch.json` の `shoya`（port 3131）。

## 公開（GitHub Pages）

1. GitHub にリポジトリを作って push（例：`akipaje181/shoya-no-michi`）
2. リポジトリの Settings → Pages → Source を **GitHub Actions** にする
3. `main` に push すると `.github/workflows/pages.yml` がビルドして公開（`NEXT_PUBLIC_BASE_PATH=/<リポジトリ名>` を自動で付ける）
4. URL は `https://<ユーザー名>.github.io/<リポジトリ名>/`

手元で同じものを作るなら `NEXT_PUBLIC_BASE_PATH=/shoya-no-michi npm run build`。

### 更新したとき
`public/sw.js` の `VERSION` を上げてから push する（古いキャッシュを捨てるため）。

## iPhone のホーム画面に追加
Safari で公開 URL を開く → 共有ボタン → 「ホーム画面に追加」。全画面のアプリとして開く。iPad も同じ。

## バックアップ
パパの応援 → 💾 データ → 「書き出す」で JSON ファイルを保存（iCloud Drive などへ）。
別の端末で「読み込む」と同じ記録になる。写真・動画はバックアップに含まれない。

## Supabase（端末間の自動同期・まだ未接続）
今は端末内保存のみ。`src/lib/store.ts` の `DataStore` を Supabase 版に差し替えれば同期できる構造。
やるときの手順：
1. supabase.com でプロジェクト作成（無料枠）
2. `docs/設計.md` §4 の型をもとにテーブルを作る（`player_profiles`, `practice_records`, `game_records`, `goals`, `xp_transactions`, `media_assets` …）
3. RLS を有効にし、保護者アカウントのみ読み書きできるポリシーにする
4. `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `src/lib/store.ts` に `SupabaseStore` を実装し、起動時に localStorage とマージ

## データの場所
- 記録：`localStorage["shoya.road.v1"]`（1つ前の版 `.bak` も保持）
- 写真・動画：IndexedDB `shoya-road-media`
- 保護者 PIN：記録の中の `settings.parentPin`（端末内のみ）
