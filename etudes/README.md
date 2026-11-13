# Clock Studies New Tab

One Chrome extension that holds every étude. It opens on the newest clock; the faint ring in the upper left chooses another, or a different one each tab. A new clock reaches people as an update to this one extension, so adding a clock needs no new store listing.

- `extension/` is the frame: `newtab.html` fills the tab with an iframe of the chosen clock and adds the chooser. The choice is kept in `localStorage`, so there are still no permissions and no network requests.
- `build.mjs` (`npm run build:etudes`) copies each clock from `site/etudes.json`, newest first, into `dist/etudes/extension/<slug>/` as it is, writes the list to `clocks.js`, and zips the whole into `dist/etudes/clock-studies-<version>.zip`.
- `#clock=<slug>` opens one clock without changing the choice. The rest of the hash goes to the clock, for example `newtab.html#clock=startrail&t=21:47`.
- `store/media.mjs` makes the store images into `dist/etudes/store-upload/`.

## Adding a clock

1. Add the clock as for the site (README, "To add the week's étude").
2. Raise `version` in `extension/manifest.json`.
3. Run `npm run build:etudes` and upload `dist/etudes/clock-studies-<version>.zip` in the Chrome Web Store dashboard (Package > Upload new package), then submit it for review. The store refuses a version it already has.
