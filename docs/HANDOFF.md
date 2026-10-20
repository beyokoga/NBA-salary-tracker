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
10. お気に入り（`?tab=favorites`）

## 2. 現在のGit状態（重要）

2026-10-20、DriveのGit bundleからCodexローカルへの移行が完了しました。

- GitHub mainとローカルmainにお気に入りの実装コミット`989365c`を反映済み。`cdcddb0` と `3c6f4ed` も元のコミットIDのまま含む
- お気に入りの作業ブランチ: `codex/favorites`（cleanなmainの`3c6f4ed`から作成）
- 2026-10-20にユーザーから公開URLへの反映指示を受け、GitHub mainへのpushとVercel本番公開・画面確認が完了
- npm auditの修正や依存バージョンの変更はこのタスクに含めない

GitHubから開始しても全体検索とお気に入りを含む状態を取得できます。作業前に`cdcddb0`・`3c6f4ed`・`989365c`の履歴と作業ツリーを確認してください。

Arenaで未pushだった理由は書き込み認証の不足でした。Codex側では2026-10-20にGitHubへのpush権限をdry-runで確認済みです。PATや秘密情報をrepo内に保存しないでください。

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

## 3.1. お気に入り実装とローカル検証（2026-10-20）

- `src/lib/favorites.ts`: `useSyncExternalStore`による小さな共有ストア
- 保存キー: `nba-salary-tracker:favorites:v1`。保存するのは`teams`と`players`のキー配列のみ
- チームは`slug`、選手は`teamSlug:player id`の複合キーで識別
- 現在の同梱データに存在しないキーは一覧表示時に無視し、保存内容を自動削除しない
- localStorageの読み書きが失敗しても、そのページ内のメモリで操作を継続。保存不可の案内を表示
- 別タブでの登録・解除はstorageイベントで同期
- チーム詳細と選手一覧に☆/★ボタン。`aria-pressed`、日英ラベル、キーボード操作に対応
- 選手の星は行の遷移・展開と干渉しない。全体検索結果の構造は変更していない
- ドロワーに「お気に入り」タブを追加。チーム・選手を分けて表示し、詳細・選手絞り込みへのリンクと解除操作を用意
- 未登録時はチーム一覧・選手一覧へのリンクと、ヘッダー検索の案内を表示
- `node --test tests/favorites.test.mjs`: 8件成功（SSR、保存と復元、複合キー、不正データ、保存拒否、通知、別タブ同期、再購読）
- `npm run lint`: 成功
- `npm run build`: 成功（Node.js 24.19.0、TypeScript検査・41ページ生成）
- ブラウザー確認: 登録、再読み込み後の保持、一覧からの遷移、解除、別タブ同期、日英表示、Enter/Space操作
- デスクトップと390pxモバイルの一覧、モバイルのチーム詳細・選手一覧で横はみ出し0px。確認操作のconsole errorは0件
- 保存拒否・不正JSONはストアの自動テストで確認。実機モバイル・本番デプロイの検証は未実施
- WindowsのTurbopack子プロセス通信エラーが再発したが、旧ローカルサーバー停止と`.next`退避後の通常環境ビルドで成功。退避先はrepo外の`../favorites-runtime/build-before-retry`
- 確認用URL: http://127.0.0.1:3000/?tab=favorites （ローカルサーバーの現在の稼働は再確認すること）

### 本番公開の確認（2026-10-20）

- 公開URL: https://nba-salary-tracker.vercel.app/
- お気に入り: https://nba-salary-tracker.vercel.app/?tab=favorites
- 実装コミット: `989365c06c65f3764a93e5bb9ddfecdb841dbaa7`
- 初回本番デプロイ: `dpl_3oZPwwu4sRsKuxueu61hToiCWTmy`、READY、GitHubのVercelチェックもsuccess
- 本番ドメインのaliasが上記デプロイへ切り替わったことを確認
- 本番ブラウザーでチーム・選手の登録、一覧、再読み込み後の保持、解除、全体検索と遷移を確認
- 本番390px表示の横はみ出し0px、確認操作中のconsole error 0件。検証用に追加した2項目はUIから解除済み
- Vercel連携の詳細ビルドログ・デプロイ一覧はscope権限不足（403）。デプロイ状態・コミット・aliasとGitHubチェック、公開画面を根拠として確認。サーバー側ログ全体の監査は未実施
- npm audit修正・依存バージョン変更は行っていない

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

1. 全体検索・引き継ぎ・お気に入りのGitHub反映と本番確認は完了
2. 次の機能候補はトレードマシン Lite（実装開始はユーザーの指示に従う）
3. 共有カード画像 / PWA など

## 8. Codexへの最初の指示例

Codexには、まず次を確認させてください。

```text
AGENTS.md と docs/HANDOFF.md と docs/ROADMAP.md を読んでください。
最初に、現在のベースコミットに cdcddb0（feat: add global player/team search）以降が含まれているか確認してください。
含まれていない場合は、実装を始めず「移行未完了」と報告してください。
含まれている場合は、docs/ROADMAP.md の優先順位に従って次の機能を小さなPR単位で進めてください。
変更後は npm run lint と npm run build を実行し、UI変更時はデスクトップと390pxモバイルで表示確認してください。
```
