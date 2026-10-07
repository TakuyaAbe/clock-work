# Komorebi Clock New Tab

A Chrome extension that replaces the new tab page with the time written in sunlight through leaves on a plaster wall.

Inside the digits the canopy opens, so pinhole images of the sun cluster there; the rest of the wall stays in leaf shade with only a few stray spots. The digits sway and breathe with the wind. On each new minute a small cloud passes: the light dims, the leaves rearrange into the new time, and the sun comes back. The light follows the local hour: pink-orange at dawn, warm white in the morning, bright and neutral at noon, golden with long ellipses in the late afternoon, deep orange at dusk, and cool blue moonlight at night.

![screenshot](store/screenshot_1280x800_a.png)

- Manifest V3, no permissions, no network requests
- WebGL 1 and vanilla JavaScript, no build step, no web fonts
- Moving the pointer nudges the wind and the sun a little; it works without a mouse
- Respects `prefers-reduced-motion` (slower wind, no gusts, near-instant minute change)
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
