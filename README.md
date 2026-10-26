# サイトの編集方針

このリポジトリは Quarto の公開サイト `kobayashi-mitsuki.github.io` のソースを管理する。各ページの編集時には、既存の見た目、導線、公開形式を確認し、変更対象を限定する。

## 教材ページの階層ナビゲーション

- **各授業の資料一覧ページ**（例：`teaching/fourier-analysis.qmd`）と、そこから開く**詳細ページ**（例：`teaching/fourier-analysis/exams/corrections.qmd`）では、上部にパンくずリスト、本文の末尾左側に**直接の親ページへ戻るリンク**を置く。
- パンくずリストは「授業・教材 › 授業名 › 詳細ページ」のように上位階層をリンクにし、現在のページ名はリンクにしない。ページ上部は**階層の案内**であり、「～に戻る」というリンクにはしない。
- 本文末尾には `← ○○一覧に戻る` というリンクを左寄せで置く。右端への配置や、ページ内の既存リンク・教材内容の変更は行わない。
- `teaching.qmd` は授業一覧の入口なので、授業詳細と同様の「授業一覧に戻る」は追加しない。通常のナビゲーションバーは引き続き利用する。
- Quarto の `.qmd` 同士は **相対パスでリンク**し、リンク先と公開後の生成ページを確認する。表示クラス `.page-breadcrumbs`、`.page-back-link` は `styles.css` で管理する。

### 記述例：授業資料一覧

```markdown
::: {.page-breadcrumbs role="navigation" aria-label="パンくずリスト"}
[授業・教材](../teaching.qmd) › **フーリエ解析**
:::

（本文）

::: {.page-back-link}
← [授業・教材一覧に戻る](../teaching.qmd)
:::
```

詳細ページでは上位の「授業・教材」と「フーリエ解析」の両方をパンくずリンクにし、末尾の戻りリンクは**直接の親**であるフーリエ解析の資料一覧へ向ける。

## 教材公開

レポートPDF等の公開形式を勝手に別媒体へ変換しない。原本、既存の同種資料の掲載方式、サイト内の命名・リンク規則、公開後の検証手順については、授業固有 governance と [授業教材のホームページ公開の共通手順](https://github.com/kobayashi-mitsuki/teaching-governance/blob/main/workflows/material-publication.md) を参照する。
