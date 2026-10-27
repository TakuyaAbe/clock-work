# Chrome Web Store 掲載情報 — Sunlit Scale New Tab

## パッケージ
- `dist/sunlit/sunlit-scale-newtab-1.0.0.zip`（Manifest V3、権限なし、外部通信なし。`_locales` で英語（既定）と日本語に対応。`dist/` は git 管理外）
- ドラッグ用にまとめたもの: `dist/sunlit/store-upload/`（zip、画像、コピー用の申請シート `copy_sheet.html`）

## ストアの掲載情報タブ
- **名前・概要**: `_locales` から自動で入る（ダッシュボードの言語メニューで英語・日本語を切り替えて確認できる）
  - 英語: Sunlit Scale New Tab ／ A quiet new tab: a line of sunlight through the blind falls across three scales on a desk. The current time stands in the light.
  - 日本語: 光の目盛り — 新しいタブ ／ 静かな新しいタブ。ブラインドの隙間から差すひと筋の光が、机の上の三本の目盛りを横切ります。その光の中に、いまの時刻が並びます。
- **カテゴリ**: ライフスタイル › アート＆デザイン（または「Chrome をカスタマイズ › 機能と UI」）
- **言語**: 英語（既定）と日本語。どちらの掲載情報にも下の日英併記の説明を入れる

### 詳細な説明（日英併記、英語・日本語の両方の掲載情報に同じものを入れる）
新しいタブを、机の上の三本の目盛りに。ブラインドの隙間から差すひと筋の光の中に、いまの時・分・秒が並びます。光の色は時間とともに移り、夜は小さなスタンドの明かりに替わります。机の上の文房具は、タブを開くたびに置き直されます。右下の薄い丸を押すと、playground で一日の光を早送りしたり、カメラの角度や絞りを変えたりできます。カメラの設定はブラウザに保存され、次のタブにも引き継がれます。
権限なし・通信なし・トラッキングなし。

Your new tab becomes three scales on a desk. Through a gap in the blind, a line of sunlight falls across them, and the current hour, minute and second stand in the light. Its colour follows the time of day, and at night a small desk lamp takes over. The stationery on the desk is laid out afresh with each new tab. The faint ring in the lower right opens the playground, where you can fast-forward through the day or adjust the camera's angle and aperture; camera settings are saved in your browser for future tabs.
No permissions, no network requests, no tracking.

### グラフィック
- アイコン 128×128: `extension/icons/icon128.png`（zip に同梱）
- スクリーンショット 1280×800（5 枚、この順で）:
  1. `screenshot_1280x800_a.png` — 朝の淡い金色の光 08:15
  2. `screenshot_1280x800_b.png` — 昼の白い光 12:40
  3. `screenshot_1280x800_c.png` — 夕方の琥珀色の光 16:52
  4. `screenshot_1280x800_d.png` — 夜、スタンドの明かり 22:10
  5. `screenshot_1280x800_e.png` — playground を開いたところ（日没後 18:20）
- 小プロモーションタイル 440×280: `promo_small_440x280.png`
- マーキー プロモーションタイル 1400×560（任意）: `promo_marquee_1400x560.png`
- プロモーション動画（任意）: 欄は YouTube の URL。上げる場合は紹介動画（日中・時間帯つなぎ）を使う

## プライバシーへの取り組みタブ
- **単一用途の説明**: Replaces the new tab page with a clock told by a line of light across three scales on a desk.
- **権限の正当性**: 要求する権限はありません（`chrome_url_overrides.newtab` のみ）。
- **リモートコード**: 使用していません。
- **データの使用**: どのユーザーデータも収集・使用しません（すべてのチェックボックスを外したまま、3 つの宣言にチェック）。playground のカメラ設定はブラウザの localStorage にだけ保存され、外に送られません。
- **プライバシーポリシー URL**: ユーザーデータを扱わないため不要。

## 配布タブ
- 公開設定: 公開
- 地域: すべての地域
