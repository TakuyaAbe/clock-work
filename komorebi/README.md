# Komorebi Clock New Tab

A Chrome extension that replaces the new tab page with sunlight falling through leaves onto a plaster wall. It is a clock without numerals: the time is told by the shadow of a sprig.

Everything on the wall is a shadow of something in front of it, cast by a sun that moves with the local hour. A far canopy (5 to 9 m from the wall) is an almost closed roof of leaves; the light through its gaps lands as soft, round pinhole images of the sun. A nearer layer of leaves (1.5 to 3 m) casts blurred leaf shapes, and a dozen branches hang between 0.9 and 3 m from the wall, so their shadows are soft. A thin branch reaches in from the lower left, close to the wall, and ends in the clearing. At its tip three shoots tell the time: a short twig with broad, pointed leaves is the hour hand, a long slender one with narrow willow leaves is the minute hand, and the thinnest tendril, curling at its tip, sweeps the seconds. The branch's side twigs look much like them, so the time hides among them until you look for it. The farther something is from the wall, the softer its shadow, because the sun is a disc rather than a point; a slight lens defocus softens everything a little more, and the brightest edges of the dappled light split faintly into colour. Each minute the shadow of a small cloud passes over. The light follows the local hour: pink-orange at dawn, warm white in the morning, bright and neutral at noon, golden with long ellipses in the late afternoon, deep orange at dusk, and cool blue moonlight at night.

![screenshot](store/screenshot_1280x800_a.png)

- Manifest V3, no permissions, no network requests
- WebGL 1 and vanilla JavaScript, no build step, no text on screen
- Shadows are computed from 3D leaves and twigs: each layer is projected along the sun onto the wall, then averaged over the sun's disc
- Moving the pointer nudges the wind and the sun a little; it works without a mouse
- Respects `prefers-reduced-motion` (slower wind, no gusts, a shorter and fainter cloud)
- Rendering is capped at about 30 fps when idle, with device pixel ratio capped at 1.5

## Debug

Add `#debug` to the page URL, or press Shift+D on the page, to show a sequence bar: a slider over the day's light (0 to 24 h), play and pause at x1 to x3600, a button that sends the minute's cloud across now, and a button back to the real time. `#t=HH:MM` fixes the time without the bar.

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
