# Komorebi Clock New Tab

A Chrome extension that replaces the new tab page with sunlight falling through leaves onto a plaster wall. It is a clock without numerals.

The light keeps time the way real light does. Where the canopy thins, the light gathers into a pool, and that pool walks across the wall through the day: low on the left after sunrise, high in the middle at noon, low on the right before sunset. At night a fainter pool of moonlight makes the same crossing. Each minute the shadow of a small cloud passes over. The light follows the local hour: pink-orange at dawn, warm white in the morning, bright and neutral at noon, golden with long ellipses in the late afternoon, deep orange at dusk, and cool blue moonlight at night.

![screenshot](store/screenshot_1280x800_a.png)

- Manifest V3, no permissions, no network requests
- WebGL 1 and vanilla JavaScript, no build step, no text on screen
- Moving the pointer nudges the wind and the sun a little; it works without a mouse
- Respects `prefers-reduced-motion` (slower wind, no gusts, a shorter and fainter cloud)
- Rendering is capped at about 30 fps when idle, with device pixel ratio capped at 1.5

## Install from source

1. Open `chrome://extensions` and turn on Developer mode.
2. Click "Load unpacked" and choose the `extension/` folder.
3. Open a new tab.

To preview a fixed time of day, open the page with a hash such as `newtab.html#t=17:42`.

## Package for the Chrome Web Store

```sh
cd extension && zip -rqX ../komorebi-clock-newtab.zip manifest.json newtab.html newtab.js icons
```

Store graphics are in [`store/`](store/).

---

新しいタブを、漆喰の壁に落ちる木漏れ日で現在時刻を描く時計に置き換える Chrome 拡張機能です。権限・外部通信なし。
