# moji — 文字数カウント

入力と集計に集中できる、シンプルな文字数カウントサイトです。

**サイト:** https://usaginchaku.github.io/moji-count/

## 機能

- リアルタイム／手動での文字数カウント
- 改行・空白を除いた文字数、行数、400字詰め原稿用紙換算
- 読了時間、発表時間、英単語数、文字種の内訳
- UTF-8／UTF-16／Shift-JIS／EUC-JP／JISのバイト数
- 目標文字数、コピー、貼り付け、テキストダウンロード
- 全角・半角、ひらがな・カタカナ変換、操作直後の復元
- タブ内の下書き保存

説明と計算基準はインフォメーションページにまとめています。スマートフォンでは拡大縮小を抑止するviewport設定とタッチ処理を使用しています。端末・ブラウザのアクセシビリティ設定が優先される場合があります。

## ローカル実行

Python 3がある環境で以下を実行し、http://localhost:3000 を開きます。

```sh
npm start
```

ビルドや依存パッケージのインストールは不要です。`dist/`を任意の静的HTTPサーバーでも配信できます。

テストにはNode.js 22以降を使用します。

```sh
npm test
```

## 公開

`main`へのpushでGitHub Actionsがテストを実行し、`dist/`をGitHub Pagesに公開します。リポジトリの **Settings → Pages → Source** は **GitHub Actions** を使用します。

## 入力内容

入力した文章の集計と変換はすべてブラウザ内で行います。ツールから文章を外部へ送信することはありません。下書き・目標・設定は現在のタブの`sessionStorage`に保存します。ブラウザのタブ復元機能によって下書きが復元される場合があります。

文字数はUnicodeコードポイント、改行はLFに統一して計算します。原稿用紙は400文字単位の簡易換算です。各サービス固有のSNS文字数制限には対応していません。

## 構成

- `dist/index.html`: カウント画面
- `dist/info.html`: 使い方・計算基準・プライバシー
- `dist/app.mjs`: 画面操作
- `dist/counter.mjs`: 文字数・文章分析
- `dist/text-tools.mjs`: 文字コード・文字変換
- `dist/vendor/`: 同梱ライブラリとライセンス
- `tests/`: 集計・変換のテスト

文字コード変換にはMITライセンスの[encoding-japanese](https://github.com/polygonplanet/encoding.js)を使用しています。原文ライセンスと取得元は`dist/vendor/`に収録しています。
