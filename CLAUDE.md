# clock-work

時計のエチュード（https://clock.sayuno.me）。構成、サイトのビルドとデプロイ、エチュードの足し方は README.md にある。確かめ方、撮り方、ストアの素材、新しいエチュードの出し方は `clock-etude` スキルにある。

- 公開リポジトリ。メールアドレス、認証情報、勤務先に関わることを、ファイルにもコミットにも書かない。
- main への push は、そのまま本番サイトへのデプロイになる（Cloudflare Workers Builds）。
- wrangler は package.json の scripts（`npm run whoami` / `preview` / `deploy`）経由で使う。素の `wrangler` や `npx wrangler` は、このマシンの別のアカウントに向く。
- 未追跡の `.agents/`・`.claude/`・`skills-lock.json` はユーザーのもの。触らない、コミットしない。
- 画面の文言、サイトとストアの文面は、日本語と英語の両方を用意する。サイトは併記、拡張機能は `_locales` と表示言語で切り替える。
- Chrome Web Store のダッシュボードは、Claude からは操作できない（Claude in Chrome でも内蔵ブラウザでも）。提出物を `dist/<slug>/store-upload/` に揃え、入力と送信はユーザーが行う。
- 画面を確かめる道具は `tools/`（使い方は各ファイルの先頭）。Chrome を起動するので、Bash はサンドボックスの外で動かす。Komorebi の天文計算のテストは `node --test komorebi/test/sky.test.mjs`。
