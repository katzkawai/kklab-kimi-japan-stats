# 日本経済ダッシュボード（kklab-kimi-japan-stats）

World Bank「World Development Indicators (WDI)」のデータに基づく、日本の主要経済指標の統計ダッシュボードです。ビルド不要の静的サイトで、そのまま GitHub Pages で公開できます。

## 表示内容

KPI カード（最新値と前年比）と 7 つのグラフを表示します（1990–2025年）。

- GDP（名目・米ドル）と実質GDP成長率
- 一人当たりGDP（名目・米ドル）
- 消費者物価上昇率（インフレ率）と失業率
- 総人口と人口増加率
- 為替レート（円/米ドル・年平均）
- 輸出・輸入（対GDP比）
- 経常収支（対GDP比）

出典: [World Bank, World Development Indicators](https://data.worldbank.org/country/japan)

## ファイル構成

```
index.html               ダッシュボード本体
assets/css/style.css     スタイル
assets/js/app.js         データ読み込みとチャート描画（ECharts）
data/indicators.json     指標データ（tools/update_data.py が生成）
tools/update_data.py     World Bank API から直接取得して data/indicators.json を再生成（PEP 723）
tools/build_data.py      WDI の CSV から data/indicators.json を生成（PEP 723）
tools/smoke_test.js      app.js のレンダリング経路を検証するスモークテスト
```

## ローカルでの確認

`fetch()` で JSON を読み込むため、`file://` で直接開くと動作しません。ローカルサーバー経由でアクセスしてください。

```bash
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

## データの更新

GitHub Actions（`.github/workflows/update-data.yml`）により、毎月9日に自動で最新データを取得し、変更があれば `data/indicators.json` をコミット＆プッシュします（push をトリガーに Pages も自動再ビルド）。手動で実行したい場合は Actions タブの「Update data」ワークフローから `workflow_dispatch` で実行できます。

ローカルで手動更新する場合は以下を実行します。

```bash
uv run tools/update_data.py
git add data/indicators.json
git commit -m "Update data"
git push    # push 後、GitHub Pages が数分で自動再ビルドされます
```

CSV を手元で管理したい場合は、WDI の CSV（列: `indicator,country,date,unit,value`）から生成することもできます。

```bash
uv run tools/build_data.py <CSVファイル>...
```

## テスト

DOM・ECharts をスタブ化して `app.js` の描画経路（KPI 生成・チャート設定・欠損年の位置合わせ）を検証します。

```bash
node tools/smoke_test.js
```

## GitHub Pages での公開

```bash
git init
git add .
git commit -m "Initial commit: Japan economic dashboard"
gh repo create kklab-kimi-japan-stats --public --source=. --push
```

その後、GitHub のリポジトリ設定で Pages を有効化します。

1. リポジトリの **Settings → Pages** を開く
2. **Source** を `Deploy from a branch`、**Branch** を `main` / `/ (root)` に設定して保存
3. 数分後に `https://<ユーザー名>.github.io/kklab-kimi-japan-stats/` で公開されます

`gh` CLI で有効化する場合:

```bash
gh api repos/<ユーザー名>/kklab-kimi-japan-stats/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

## 注意事項

- 本ページはデータの可視化を目的としたもので、投資助言ではありません。
- ECharts は CDN（jsDelivr）から読み込んでいます。
