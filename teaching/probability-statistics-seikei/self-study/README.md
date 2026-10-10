# 確率統計 Web 自習用練習問題

このディレクトリには、private の問題正本から生成した公開用データと、授業回に共通する表示・採点UIを置く。

## 構成

- `assets/exercise-engine.mjs`：問題表示、採点、解説表示、進捗表示、MathJax 再描画。
- `assets/exercise.css`：ライト・ダークモードおよびモバイル対応の共通スタイル。
- `data/NN.json`：問題正本から生成する公開用派生データ。
- `NN.qmd`：授業回ごとの薄い入口ページ。

問題文、選択肢、正解、解説をこのリポジトリで手作業修正しない。内容を変える場合は `probability-statistics-seikei-self-study-exercises/problems/NN.yml` を修正し、同リポジトリの `scripts/export_web.py` で再生成する。

## 第2回の公開前状態

第2回は問題正本が `draft` であるため、`02.qmd` も `draft: true` とし、`_quarto.yml` の `project.render` から明示的に除外している。通常の `quarto render` ではHTML、JSON、JavaScript、CSSのいずれも `docs` へ搬出されない。

ローカルレビューでは、問題リポジトリから `data/02.json` を `--allow-draft` 付きで生成し、次を実行する。

```powershell
quarto preview teaching/probability-statistics-seikei/self-study/02.qmd --metadata draft=false
```

このプレビューは単独ページとして起動する。サイト全体と同じ配置での最終確認は、公開直前に下記の除外解除を行った状態で実施する。

レビュー後に公開する場合は、次を一組として行う。

1. 問題正本の `status` を、人間の内容確認後に `published` へ変更する。
2. `--allow-draft` なしで公開用JSONを再生成する。
3. `02.qmd` の `draft` を解除する。
4. `_quarto.yml` の `project.render` から第2回の除外指定を削除する。
5. 確率統計の授業ページと必要なナビゲーションへリンクを追加する。
6. 通常の `quarto render` とブラウザテストを再実行する。
