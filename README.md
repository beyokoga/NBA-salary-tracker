# NBAサラリートラッカー / NBA Salary Tracker

NBA 30チームのサラリー（ペイロール）・ラグジュアリータックス・将来契約をまとめて追跡できる Web サイトです。
2026-27 シーズンのオフシーズンスナップショットを静的データとして同梱しており、**外部 API なしで完全にオフライン動作**します。

- シーズン: **2026-27**（ロスター基準日 2026-09-16 / nbasalaries.com 公開スナップショット 2026-09-13）
- UI: **日本語 / English 切替**（ヘッダーの `JA / EN`、選択は localStorage に保存）
- レンダリング: 全ページ静的生成（SSG, 38 ページ）

## 主な機能

サイトは**単一ページのタブ構成**です（`/?tab=…` で7セクションを切替。旧パス `/teams` `/players` `/tax` `/free-agency` `/news` `/cap-history` `/teams/<slug>` はすべて対応するタブへリダイレクトされます）。

| ページ | パス | 内容 |
| --- | --- | --- |
| ダッシュボード | `/` | リーグ全体のペイロール分布（しきい線付きバー）、トップ10サラリー、支出×勝率の散布図、2026 プレーオフ結果、2025-26 主要タイトル、ペイロール増減トップ |
| チーム一覧 | `/teams` | 30チームをペイロール順で比較。ソート・検索・カンファレンス絞り込み・CSV エクスポート |
| チーム詳細 | `/teams/<slug>` | キャップポジション（しきいバー）、税額の内訳（ブラケット表）、ロスター全文（オプション/FA 年付き）、過去5シーズンの推移、将来契約マトリクス（2031-32 まで）、リーグ順位、FA 予定選手 |
| 選手年俸 | `/players` | 全 442 選手のソート可能な一覧（年俸・キャップ比・契約最終年・オプション）、CSV エクスポート |
| タックス試算 | `/tax` | チーム選択 or スライダーでペイロールを動かし、ブラケット税・アプロン加算税・実効税率をその場で計算。シナリオ差分とリーグ全体の税負担・分配額も表示 |
| 契約満了・FA | `/free-agency` | 2027 年夏に満了する契約（132 件 / $1.26B）と、先にあるオプション年（256 件 / $2.61B）をチーム別・年別に一覧化 |
| ニュース | `/news` | 直近45日のトランザクション（新規契約/トレード/ウェーバー等）を日付順タイムラインで。タブ・チーム絞り込み・ESPN見出し付き |
| キャップ推移 | `/cap-history` | 2022-23 → 2026-27 のキャップ/タックス/アプロン/フロアの公式発表額、前年比上昇率、シーズン別サマリー表、2026-27 の全基準額（MLE・BAE・max・TPE 等 16 項目） |

## 起動方法

```bash
npm install
npm run build     # 全ページを静的生成
npm start         # http://localhost:3000 （0.0.0.0:3000 で Listen）

# 開発モード
npm run dev
```

> 開発モードを localhost 以外（IP 指定やプロキシ経由）から開く場合は `next.config.ts` の `allowedDevOrigins` にホストを追加してください（Next 16 は開発リソースのクロスオリジン要求を既定でブロックします）。本番ビルド（`npm start`）にはこの制限はありません。

## 公開デプロイ（Vercel）

- 本番URL: **https://nba-salary-tracker.vercel.app** （2026-10-09 初回デプロイ、Deployment Protection は無効化済み）
- **ビルド時自動再取得**: Vercel の buildCommand は `bash scripts/vercel-build.sh` で、ビルドのたびに nbasalaries.com / ESPN からデータを再取得します（取得できない場合は同梱データにフォールバックして必ずビルドが成功します）。つまり**再デプロイ = 最新データ公開**です
- 鮮度チェック API: `GET /api/freshness` → 同梱スナップショット日付と上流の公開日付を比較し `stale: true/false` を返します（6時間キャッシュ）
- ワンコマンド更新+公開: `VERCEL_TOKEN=<your-token> scripts/deploy.sh`（再取得 → ビルド → 本番デプロイ）
- 手動デプロイのみでもビルド時に再取得されます: `VERCEL_TOKEN=<your-token> npx vercel deploy --prod --yes`

> 上流（nbasalaries.com）自体のスナップショットが更新されない限り数値は変わりません。`/api/freshness` が `stale: true` を返したタイミングが再デプロイの目安です。

## データの更新方法

データは `data/app/*.json` として同梱されています。シーズン開幕後・トレード後に更新したいときは同梱のスクリプトで再取得できます:

```bash
npm run scrape
```

これは次の3ステップを順に実行します:

1. `scripts/scrape_teams.py` — nbasalaries.com から30チーム分のロスター・キャップ・税・将来契約を取得し `data/teams.json` / `data/league.json` を生成（HTML は `raw/` にキャッシュ、`--offline` でキャッシュのみ使用、`--team <slug>` で1チームだけ再取得）
2. `scripts/fetch_standings.py` — ESPN 公開 API から直前シーズン（2025-26）の順位を取得し `data/records.json` を生成（プレーオフ bracket と awards はスクリプト内に記録）
3. `scripts/fetch_news.py` — ESPN 公開 API から直近45日のトランザクションとリーグ見出しを取得し `data/app/news.json` を生成
4. `scripts/build_data.py` — 上記をアプリ用の JSON（`data/app/`）に変換。ラグジュアリータックスの計算もここで実施

変換だけやり直したい場合（税モデルを調整した等）は `npm run data:build` を使います。

## ラグジュアリータックスのモデル

`scripts/build_data.py` と `src/lib/tax.ts` に同一ロジックを実装しています（変更時は両方を同期させてください）:

- ブラケット幅 = そのシーズンのタックスペイヤーMLE（2026-27 は $6.064M）
- 標準税率: $1.00 / $1.25 / $3.50 / $4.75（以降ブラケットごとに +$0.50）
- リピーター税率（過去4シーズン中3シーズン以上で課税対象となったチーム）: $3.00 / $3.25 / $5.50 / $6.75（以降 +$0.50）
- アプロン加算: 税額に対して、タックスライン〜第1アプロンの超過分 ×$2.50、第1〜第2アプロン分 ×$3.50
- 分配: 徴収額（ブラケット税）の 50% を非課税チームで均等分配

`taxEstimate`（ブラケット税）と `taxAllIn`（加算込み）を区別して表示しています。nbasalaries.com 掲載の推計値はブラケット税のみです。

## データ出典

- ロスター・年俸・キャップ計上: [nbasalaries.com](https://nbasalaries.com/) 公開スナップショット（2026-09-13 基準）
- キャップ基準額（キャップ/タックス/アプロン/MLE 等）: NBA 公式発表値
- 2025-26 順位: ESPN 公開 standings API
- 2025-26 のペイロール実績: SalariesWish / Spotrac 系の集計値（nbasalaries.com 由来）

税額・分配額などはシーズン終了時の確定計算で変わる推計値です。インセンティブ、キャップホールドの一部、シーズン中のトレードは含まれません。

## 構成

```
scripts/            取得・変換スクリプト（Python 3, requests + BeautifulSoup）
raw/                取得HTMLキャッシュ
data/               生データ（teams.json / league.json / records.json）
data/app/           アプリが読む JSON（league / players / free-agency / team/*.json）
public/logos/       チームロゴ SVG（ローカル同梱）
src/app/            Next.js App Router のページ
src/components/     UI・チャート（依存ライブラリなしの手組みSVG）
src/lib/            型・データローダ・ formatter ・税モデル・CSV出力
src/i18n/           日英辞書と言語プロバイダ
```

## 技術スタック

Next.js 16 (App Router, Turbopack) / React 19 / Tailwind CSS v4 / TypeScript。
チャートはすべて自作 SVG コンポーネント（`src/components/charts/`）で、追加依存はありません。

## GitHub 連携（ハイブリッド運用）

コードは GitHub のプライベートrepo `nba-salary-tracker` で管理し、Vercel がそのrepoに連携しています（push = 自動デプロイ）。
`.github/workflows/vercel-redeploy.yml` が毎日 03:00 JST に Vercel のデプロイフックを叩き、データを再取得して再デプロイします（repo secret `VERCEL_DEPLOY_HOOK` が必要）。
