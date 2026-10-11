# Chrome Web Store 掲載情報 — Komorebi Clock New Tab

## パッケージ
- `dist/komorebi/komorebi-clock-newtab-1.0.0.zip`（Manifest V3、権限なし、外部通信なし。`dist/` は git 管理外）
- ドラッグ用にまとめたもの: `dist/komorebi/store-upload/`（zip、画像、コピー用の申請シート `copy_sheet.html`）

## ストアの掲載情報タブ
- **名前**: Komorebi Clock New Tab（manifest から自動入力）
- **概要（132 文字以内, manifest の description）**:
  A quiet new tab: soft tree shadows on a plaster wall, cast by the sun of the hour. One branch gently tells the time.
- **カテゴリ**: ライフスタイル › アート＆デザイン（または「Chrome をカスタマイズ › 機能と UI」）
- **言語**: 英語（日本語を追加する場合は下の説明文を使用）

### 詳細な説明（English）
Komorebi Clock replaces your new tab page with sunlight falling through leaves onto a plaster wall. It is a clock without numerals.

Every shadow is cast by leaves and branches modelled in 3D and lit by a sun that follows your local time: pink at dawn, warm white in the morning, bright at noon, golden in the late afternoon, deep orange at dusk, and cool blue moonlight at night. Once a minute, the shadow of a small cloud passes over.

Time hides among the shadows. A branch reaches in from beyond the edge of the screen as the hour hand, pointing outward to the hour from the knot near its tip. From that knot grow a long, slender twig for the minutes and the thinnest twig, with a few small leaves, for the seconds. Like the hands of a clock, all three extend a little past the knot and cross there. Look for it, and you can read the time; look away, and it is simply the shadow of a tree.

Each new tab sets the trees out afresh, so the shadows fall a little differently every time.

Click the faint ring in the lower-right corner to open the playground: scrub through the day, play it back fast, send a cloud across, or shuffle the trees.

- No accounts, no settings, no tracking. The extension requests no permissions and makes no network requests.
- No numerals or text on the wall.
- Respects "reduce motion" in your system settings.

### 詳細な説明（日本語）
新しいタブを、漆喰の壁に落ちる木漏れ日に置き換えます。数字のない時計です。

壁の影はすべて、3Dでつくられた葉と枝が落とすものです。光は現在時刻に合わせて動く太陽から届きます。夜明けは淡い桃色、朝は温かな白、昼は明るく、夕方前は金色、日暮れは深い橙、夜は青い月明かり。1分ごとに、小さな雲の影が通り過ぎます。

時刻は影の中に隠れています。画面の外から伸びる枝が時針で、枝先近くの節から外へ向かって時を指します。その節から、分を指す細長い小枝と、小さな葉をつけたいちばん細い秒の小枝が伸びています。時計の針のように、3本とも節の先へ少しはみ出して交差しています。探せば時刻が読め、目を離せばただの木の影です。

新しいタブを開くたびに木の配置が変わり、影の落ち方も少しずつ違います。

右下の薄い丸をクリックすると playground が開きます。1日の光を早送りしたり、時刻を動かしたり、雲を流したり、木の配置を入れ替えたりできます。

- アカウント・設定・トラッキングはありません。権限を一切要求せず、外部との通信もしません。
- 壁に数字や文字は表示しません。
- OSの「視差効果を減らす」設定に従って動きを控えめにします。

### グラフィック
- アイコン 128×128: `extension/icons/icon128.png`（zip に同梱）
- スクリーンショット 1280×800（5 枚、この順で）:
  1. `screenshot_1280x800_a.png` — 朝 10:08
  2. `screenshot_1280x800_b.png` — 夕方 17:40
  3. `screenshot_1280x800_c.png` — 日没後 19:20
  4. `screenshot_1280x800_d.png` — 夜 23:15（月明かり）
  5. `screenshot_1280x800_e.png` — playground を開いたところ（06:30）
- 小プロモーションタイル 440×280: `promo_small_440x280.png`
- マーキー プロモーションタイル 1400×560（任意）: `promo_marquee_1400x560.png`
- プロモーション動画（任意）: 欄は YouTube の URL。上げる場合は紹介動画（日中・時間帯つなぎ）を使う

## プライバシーへの取り組みタブ
- **単一用途の説明**: Replaces the new tab page with a clock told by tree shadows on a wall.
- **権限の正当性**: 要求する権限はありません（`chrome_url_overrides.newtab` のみ）。
- **リモートコード**: 使用していません。
- **データの使用**: どのユーザーデータも収集・使用しません（すべてのチェックボックスを外したまま、3 つの宣言にチェック）。
- **プライバシーポリシー URL**: ユーザーデータを扱わないため不要。

## 配布タブ
- 公開設定: 公開
- 地域: すべての地域
