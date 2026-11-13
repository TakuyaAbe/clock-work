# Width Clock

A prototype. Four rows fill the page: the hours, minutes, seconds and hundredths of a second, each its own number repeated from the middle until it runs off both edges. The digits are hairlines set in a variable font; a small number is condensed, so its row holds many copies, and a large one is extended, so its row holds a few.

- `extension/newtab.html#t=10:08:42` stops the clock; the other hash values are listed at the top of `extension/newtab.js`.
- The faint ring in the lower right, or the G key, opens the playground: the time, the font's axes at zero and at the maximum, the tracking, the row gap and the margin. The values are kept in localStorage, and "Copy values" gives them as a hash.

Not done yet: a dark scheme and portrait screens checked, icons, store graphics, the site entry. The name and the slug are provisional.

## The font

`extension/fonts/RobotoFlex-digits.woff2` is [Roboto Flex](https://github.com/googlefonts/roboto-flex) (SIL Open Font License 1.1, `extension/fonts/OFL.txt`), cut down to the ten digits and to four axes: width (`wdth` 25–151), weight (`wght` 100–1000), counter width (`XTRA` 323–603) and figure height (`YTFI` 560–788). The optical size is pinned at 144 and the other axes at their defaults. It is about 9 KB.

To make it again, with fontTools and brotli installed and the full variable font from [google/fonts](https://github.com/google/fonts/tree/main/ofl/robotoflex) as `RobotoFlex.ttf` (subset first, then limit the axes):

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

t = TTFont("RobotoFlex.ttf")
o = subset.Options(); o.layout_features = ["tnum"]; o.notdef_outline = True
s = subset.Subsetter(o); s.populate(text="0123456789"); s.subset(t)
keep = {"wdth", "wght", "XTRA", "YTFI"}
pin = {a.axisTag: a.defaultValue for a in t["fvar"].axes if a.axisTag not in keep}
pin["opsz"] = 144
t = instancer.instantiateVariableFont(t, pin)
t.flavor = "woff2"
t.save("RobotoFlex-digits.woff2")
```

---

試作です。時・分・秒・100分の1秒の4行が画面を埋めます。各行はその数字を中央から左右にはみ出すまで繰り返したものです。数字は可変フォントで組んだ極細の線で、値が小さいと長体になって数多く並び、大きいと平体になって少なく並びます。

- `extension/newtab.html#t=10:08:42` で時刻を止められます。ほかのハッシュの値は `extension/newtab.js` の先頭にあります。
- 右下の薄い輪か G キーで調整パネルが開きます。時刻、ゼロのときと最大のときの軸、字間、行間、余白を動かせます。値は localStorage に残り、「値をコピー」でハッシュの形で取り出せます。

まだのこと: 暗い配色と縦長画面の確認、アイコン、ストアの素材、サイトへの追加。名前とスラッグは仮です。

フォントは Roboto Flex（SIL Open Font License 1.1）を、数字10字と4つの軸（幅・太さ・字の中の広さ・数字の高さ）だけに絞ったものです。作り方は上のとおりです。
