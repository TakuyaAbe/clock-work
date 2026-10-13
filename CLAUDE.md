# clock-work

時計のエチュード（https://clock.sayuno.me）。構成、サイトのビルドとデプロイ、エチュードの足し方は README.md にある。

- 公開リポジトリ。メールアドレス、認証情報、勤務先に関わることを、ファイルにもコミットにも書かない。
- main への push は、そのまま本番サイトへのデプロイになる（Cloudflare Workers Builds）。
- wrangler は package.json の scripts（`npm run whoami` / `preview` / `deploy`）経由で使う。素の `wrangler` や `npx wrangler` は、このマシンの別のアカウントに向く。
- 未追跡の `.agents/`・`.claude/`・`skills-lock.json` はユーザーのもの。触らない、コミットしない。
- 画面の文言、サイトとストアの文面は、日本語と英語の両方を用意する。サイトは併記、拡張機能は `_locales` と表示言語で切り替える。

## Chrome Web Store

- デベロッパーダッシュボードは、Claude in Chrome でも内蔵ブラウザでも操作できない（"The extensions gallery cannot be scripted"）。zip、画像、貼り付け用の `copy_sheet.html` を `dist/<slug>/store-upload/` にまとめ、入力と送信はユーザーが行う。
- 掲載文は `<slug>/store/LISTING.md`。拡張機能の名前と概要は `<slug>/extension/_locales/{en,ja}/messages.json`（既定は en）。
- 一度アップロードしたバージョン番号は使えない。上げ直すときは manifest の version を上げる。

## 確認と撮影

スクリプトはローカル専用の `.tools/`（gitignore）にある。

- playwright-core で Chrome for Testing（`~/Library/Caches/ms-playwright/chromium-*/` の中）を headless で起動し、`--use-angle=metal --enable-gpu --ignore-gpu-blocklist` を付けると、実際の GPU で WebGL が動く。Chrome のパスは `CH`、ページの URL は `PAGE`、出力先は `OUT`、拡張機能のフォルダは `EXT` の環境変数で渡す。
- `.tools/pw/`: `kgpu.mjs` は時刻ごとのスクリーンショット、`kstore2.mjs` はストア画像、`krec.mjs` は仮想時間でコマ単位の録画、`ext_i18n.mjs` は拡張機能として読み込んだ表示、`skytest2.cjs`・`terms.cjs` は newtab.js から天文計算を抜き出して node で検証する。
- `.tools/video/`: 録画したコマを ffmpeg でつないで動画にする。
- macOS では Chrome に `--lang` を付けても、拡張機能の文言は OS の言語で選ばれる。この Mac では en の表示を確かめられない。
