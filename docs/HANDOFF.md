# HANDOFF — NBA Salary Tracker

このドキュメントは、Arena から Codex へ開発を引き継ぐための現状メモです。
Codex は作業前に `AGENTS.md` とこのファイル、`docs/ROADMAP.md` を読んでください。

## 1. プロダクト概要

- サイト名: NBAサラリートラッカー / NBA Salary Tracker
- 本番URL: https://nba-salary-tracker.vercel.app
- GitHub: https://github.com/beyokoga/NBA-salary-tracker
- 技術構成: Next.js 16 / React 19 / TypeScript / Tailwind CSS 4
- UI: 日本語 / English 切替あり。日本語の公式用語は「エプロン」（「アプロン」ではない）
- 画面構成: 単一ページ + タブ切替。タブは URL クエリ `?tab=...` で管理する
- ナビゲーション: ハンバーガーメニューのドロワーに全タブを格納
- ヘッダー: 開いているタブに応じてタイトルが変わる

主なタブ:

1. ダッシュボード
2. チーム一覧 / チーム詳細
3. チーム比較
4. 選手年俸
5. タックス試算
6. 契約満了・FA
7. ニュース
8. クイズ
9. キャップ推移

## 2. 現在のGit状態（重要）

GitHub上の `main` と、Arena作業環境のローカル `main` には差分があります。

- GitHub `main`: `748b1a2`（毎日03:00 JSTの再デプロイワークフローまで）
- Arenaローカル `main`: `cdcddb0 feat: add global player/team search` を含む
- このHANDOFF自体も、移行用コミットとしてローカルに追加される

つまり、**Codex Cloud が GitHub から開始する場合、ローカルの未pushコミットを push するまでは最新状態を見られません。**
Codex側で作業を始める前に、ベースに `cdcddb0` 以降が含まれているか必ず確認してください。含まれていなければ、それは移行未完了です。

未pushの理由はコードの問題ではなく、Arena側の実行環境にGitHub書き込み認証が保持されていないことです。pushには、repo限定の短命なfine-grained PAT（Contents: Read and write。`.github/workflows/` を触る場合は Workflows: Read and write も）か、CodexのGitHub連携による書き込み権限が必要です。PATや秘密情報をrepo内に保存しないでください。

## 3. 直近で実装済みの変更: 全体検索

最新ローカルコミット `cdcddb0` で全体検索を追加済みです。

- 追加ファイル: `src/components/GlobalSearch.tsx`
- 変更ファイル:
  - `src/components/Shell.tsx` — ヘッダーへ検索を接続
  - `src/components/TabbedSite.tsx` — 検索結果の遷移処理、選手タブの再マウントキー
  - `src/components/PlayersView.tsx` — URLパラメータ `q` / `team` を初期値として読む
  - `src/i18n/index.tsx` — `search.*` の日英ラベル
- 仕様:
  - デスクトップではヘッダーに検索入力欄を表示
  - モバイルでは虫眼鏡アイコンから検索パネルを開く
  - チーム名、略称（例: LAL）、選手名、所属チーム名などで検索できる
  - チーム結果を選ぶとチーム詳細へ遷移する
  - 選手結果を選ぶと選手年俸タブを開き、`q=<選手名>` と `team=<略称>` で絞り込む
  - キーボード操作: 上下キーで候補移動、Enterで決定、Escapeで閉じる
- 実施した検証:
  - `npm run lint` 成功
  - `npm run build` 成功
  - Playwrightでデスクトップ確認: `Lakers` → チーム詳細、`Stephen Curry` → 選手絞り込み
  - Playwrightで390pxモバイル確認: 検索パネル `LAL` → Lakers詳細
  - 横はみ出しチェック: overflow diff = 0

## 4. デプロイとデータ更新の仕組み

- VercelプロジェクトはGitHub repoに接続済み
- `main` へpushされるとVercelが自動デプロイする
- VercelのbuildCommandは `bash scripts/vercel-build.sh`
- ビルド時に `scripts/scrape_teams.py`、`scripts/fetch_standings.py`、`scripts/fetch_news.py`、`scripts/build_data.py` でデータを再取得・再生成する
- 取得に失敗した場合は同梱データへフォールバックしてビルドを成功させる設計
- `.github/workflows/vercel-redeploy.yml` が毎日03:00 JSTにVercel Deploy Hookを叩き、データ鮮度を保つ
- ニュースは `src/app/api/news/route.ts` でESPNからライブ取得し、失敗時は同梱スナップショットを使う

## 5. データまわりの注意

- アプリ用データは `data/app/*.json` としてrepoに同梱されている
- `src/lib/data.ts` が `league.json`、`players.json`、`news.json`、`free-agency.json` を読み、チーム詳細JSONは動的importする
- スクレイピングと変換は `scripts/` 配下のPythonスクリプトで行う
- ラグジュアリータックス計算は `src/lib/tax.ts` と `scripts/build_data.py` の両方にあるため、変更時は必ず同期する
- 用語は「第1エプロン」「第2エプロン」に統一する

## 6. 開発ルール

- 作業前に `AGENTS.md`、`docs/HANDOFF.md`、`docs/ROADMAP.md` を読む
- Next.jsのコードを書く前に、`AGENTS.md` のNext.js注意ブロックに従い、関連する `node_modules/next/dist/docs/` を確認する
- UI変更をしたら、デスクトップと390pxモバイルの両方で表示確認する
- 変更後は最低限 `npm run lint` と `npm run build` を実行する
- 秘密情報、PAT、Vercelトークン、Deploy Hook URLをコードやドキュメントに追加しない
- 機能を追加・変更したら、このHANDOFFと `docs/ROADMAP.md` の状態も更新する
- 大きな変更は小さなコミット/PRに分ける

## 7. 次にやること

優先順位は `docs/ROADMAP.md` を正とします。現時点のおすすめは次の通りです。

1. 移行コミットをGitHubへpushし、Codexが最新ベースから開始できる状態にする
2. お気に入り機能（選手・チームをlocalStorageに保存）
3. トレードマシン Lite（選手を選んでサラリー合計と簡易マッチ判定、エプロン警告）
4. 共有カード画像 / PWA など

## 8. Codexへの最初の指示例

Codexには、まず次を確認させてください。

```text
AGENTS.md と docs/HANDOFF.md と docs/ROADMAP.md を読んでください。
最初に、現在のベースコミットに cdcddb0（feat: add global player/team search）以降が含まれているか確認してください。
含まれていない場合は、実装を始めず「移行未完了」と報告してください。
含まれている場合は、docs/ROADMAP.md の優先順位に従って次の機能を小さなPR単位で進めてください。
変更後は npm run lint と npm run build を実行し、UI変更時はデスクトップと390pxモバイルで表示確認してください。
```
