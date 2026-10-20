# Codex start prompt

Codexへ開発を引き継ぐときに、そのまま貼れる開始プロンプトです。

```text
あなたは NBA Salary Tracker の開発を引き継ぎます。

最初に必ず次を読んでください:
- AGENTS.md
- docs/HANDOFF.md
- docs/ROADMAP.md

作業を始める前に、現在のベースコミットを確認してください。
ベースに cdcddb0（feat: add global player/team search）以降が含まれていない場合、それは移行未完了です。
その場合は実装を進めず、含まれていないことを報告してください。

ベースが正しい場合は、docs/ROADMAP.md の優先順位に従って開発を進めてください。
当面のおすすめは、お気に入り機能、その次にトレードマシン Lite です。

守ること:
- Next.jsのコードを書く前に、AGENTS.md の指示に従って関連する Next.js ドキュメントを確認する
- 日本語の公式用語は「エプロン」に統一する
- 秘密情報やトークンをrepoに追加しない
- 変更後は npm run lint と npm run build を実行する
- UI変更時はデスクトップと390pxモバイルの両方で表示確認し、横はみ出しがないことを確認する
- 機能の状態が変わったら docs/HANDOFF.md と docs/ROADMAP.md も同じ変更で更新する

最初の返答では、読んだ内容をもとに「現在の状態」「移行が完了しているか」「次に実装する候補」を短くまとめてください。
```
