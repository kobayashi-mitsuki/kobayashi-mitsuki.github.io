# GitHub Actions による Quarto 自動 render 設定

このリポジトリでは、`.github/workflows/render-quarto.yml` により、`main` ブランチへ push されたときに GitHub Actions 上で `quarto render` を実行し、生成された `docs/` を自動コミットする設定にしています。

## 想定する GitHub Pages 設定

現在の構成を維持します。

- Branch: `main`
- Folder: `/docs`

この設定のままで、`.qmd` や `_quarto.yml` などを GitHub 上で編集して commit すると、GitHub Actions が自動的に `docs/` を更新します。

## スマホからの軽微な編集手順

1. GitHub 上で `.qmd` ファイルを編集する。
2. Commit changes を押す。
3. Actions タブで `Render Quarto site` が成功するのを確認する。
4. 少し待ってから公開ページを確認する。

## 初回に確認すること

GitHub Actions が `docs/` の更新コミットを push できない場合は、GitHub の repository settings で次を確認してください。

- Settings → Actions → General
- Workflow permissions
- `Read and write permissions` を有効化

## 注意

- `docs/` と `_site/` だけが更新された push では workflow を再実行しない設定にしています。
- これにより、Actions が生成した `docs/` の自動コミットによる無限ループを避けます。
- 研究者ホームページ本体の公開設定は、従来どおり `main` branch の `/docs` を使います。
