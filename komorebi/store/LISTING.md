# Chrome Web Store 掲載情報 — Komorebi Clock New Tab

## パッケージ
- `dist/komorebi/komorebi-clock-newtab-1.0.2.zip`（Manifest V3、権限なし、外部通信なし。`_locales` で英語（既定）と日本語に対応。`dist/` は git 管理外）
- ドラッグ用にまとめたもの: `dist/komorebi/store-upload/`（zip、画像、コピー用の申請シート `copy_sheet.html`）

## ストアの掲載情報タブ
- **名前・概要**: `_locales` から自動で入る（ダッシュボードの言語メニューで英語・日本語を切り替えて確認できる）
  - 英語: Komorebi Clock New Tab ／ A quiet new tab: soft tree shadows on a plaster wall, cast by the sun of the hour. One branch gently tells the time.
  - 日本語: 木漏れ日の時計 — 新しいタブ ／ 静かな新しいタブ。いまの太陽が、漆喰の壁にやわらかな木漏れ日を落とします。一本の枝の影が、そっと時刻を告げます。
- **カテゴリ**: ライフスタイル › アート＆デザイン（または「Chrome をカスタマイズ › 機能と UI」）
- **言語**: 英語（既定）と日本語。どちらの掲載情報にも下の日英併記の説明を入れる

### 詳細な説明（日英併記、英語・日本語の両方の掲載情報に同じものを入れる）
新しいタブを、漆喰の壁に落ちる木漏れ日に。光は実際の空に合わせて動き、時刻は一本の枝の影の中に隠れています。左下には、時刻と月齢、七十二候。右下の薄い丸を押すと、playground で1日の光を早送りできます。
権限なし・通信なし・トラッキングなし。

Your new tab becomes sunlight through leaves on a plaster wall. The light follows the real sky, and the time hides in the shadow of a single branch. In the lower-left corner: the time, the lunar age, and the 72 microseasons. The faint ring in the lower right opens the playground to play the day forward.
No permissions, no network requests, no tracking.

### グラフィック
- アイコン 128×128: `extension/icons/icon128.png`（zip に同梱）
- スクリーンショット 1280×800（5 枚、この順で）:
  1. `screenshot_1280x800_a.png` — 朝 10:08
  2. `screenshot_1280x800_b.png` — 夕方の金色の光 16:20
  3. `screenshot_1280x800_c.png` — 日没後 17:25
  4. `screenshot_1280x800_d.png` — 満月の夜 22:00（10/26）
  5. `screenshot_1280x800_e.png` — playground を開いたところ（夜明け 06:10）
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
