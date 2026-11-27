# Salah Launcher Legacy — older Samsung TVs

The normal Salah Launcher needs a TV from 2022 or newer (Tizen 6.5). This page is
about the **legacy build**, the same launcher packaged for older TVs:
**Tizen 4.0, 5.0, 5.5 and 6.0 — the 2018 to 2021 models.**

Download it from the Releases page: `salah-launcher-v8.7.58-legacy.wgt`.

**It has not been tested on a physical TV yet.** Everything below that could be
checked without a TV has been checked; the rest needs one run on the TV.

## What is different in this package

| | Normal build | Legacy build |
|---|---|---|
| Tizen version it installs on | 6.5 (2022+) | 4.0 (2018+) |
| Package id | `APLMusalla` | `APLMusallaLegacy` |
| Name in the TV's app list | Salah Launcher | Salah Launcher Legacy |
| Background categories (6.5 only) | yes | removed |
| Background service (`APLMusalla.Bridge`) | yes | not included |
| Automatic updates from inside the launcher | yes | **off** |
| Layout for TVs without CSS Grid | grid | flex fallbacks (`css/legacy-grid.css`) |

Because the package id is different, the legacy build installs next to the normal
one. Installing it can never replace or damage a 6.5 install, and the normal
build's updates can never land on it.

## What the legacy build cannot do

These need the Tizen 6.5 background model or root through Vetro, so they are not
available here:

- prayer alerts and the adhan while another app is in front (Pulse),
- the HDMI overlay and the 24/7 supervisor,
- the Vetro root features (real brightness control, remote-button remapping).

The launcher itself, the prayer times, the Hijri date, the weather, the Quran
page and reader, the radio, the nasheeds, the wallpapers and the settings all
work the same way. Automatic updates are off: a new legacy build is installed by
hand, the same way as the first one.

## How it is built

```
python3 tools/build-legacy.py                       # Tizen 4.0 (2018+) — the current legacy target
python3 tools/build-legacy.py --required-version 5.0 --suffix -legacy5
```

The script copies `app/`, changes `config.xml` (Tizen version, package ids, name,
background tags and service), adds a `globalThis` shim for older browsers,
switches the updater off, renames the installed-app paths, adds the grid
fallbacks, rebuilds `js/app.bundle.js` with `tools/make-bundle.py`, and writes
`releases/salah-launcher-v<version>-legacy.wgt` plus its `.sha256`.

`app/` itself is never touched, so the normal build is unaffected.

## What was checked without a TV

- `tools/check-old-engines.py --target 56 --bundle`: the only two findings
  (`globalThis`, `AbortController`) are already guarded in the source; the
  `globalThis` shim covers the rest.
- `node --check` on every script in the package: no syntax errors.
- The package opens and draws the Home Screen in a desktop Chromium at 1920×1080.
- The grid fallbacks were rendered with the fallback forced on: the dock row and
  the rows below lay out exactly as the grid version does.
- The fallbacks are inert on any browser that has CSS Grid: rendering the legacy
  package in a modern Chromium gives a pixel-identical Home Screen to the normal
  build (only the clock differs, because the two screenshots were taken at
  different minutes).

## Test checklist on the TV

Install it with Apps2Samsung as a custom `.wgt` (Developer Mode on the TV), then
open **Salah Launcher Legacy** from the Apps list.

1. The Home Screen appears: clock, Hijri date, weather, the dock with the app
   tiles in one row.
2. The prayer strip shows the six prayers with times, and the next prayer
   countdown counts down.
3. Back on the first row opens the Control Center; every tile is visible and
   nothing is cut off at the bottom.
4. The app picker and the search page show their icons in a grid, not in one long
   column.
5. The Prayer page shows the six prayer columns under the header.
6. The Quran page opens: side panel on one side, page on the other; Left and
   Right turn the page.
7. The radio starts and stops, and the sound is on the right output.
8. Settings opens, pages scroll, and the language switch (Arabic / English)
   redraws the screen.
9. Nothing shows the town name anywhere (Settings > Location shows the city you
   picked, not the one from the screenshots).

If something looks wrong, a photo of the screen is the fastest way to fix it.

## عربي

نسخة **Salah Launcher Legacy** هي نفس اللانشر لكن لشاشات سامسونج الأقدم:
Tizen 4.0 و5.0 و5.5 و6.0 (موديلات 2018 حتى 2021). ملف التثبيت:
`salah-launcher-v8.7.58-legacy.wgt` من صفحة الإصدارات.

- **لم تُجرَّب على شاشة حقيقية بعد.**
- رقم الحزمة مختلف (`APLMusallaLegacy`)، فبتتثبت جنب النسخة العادية ومش بتلمسها،
  والتحديث التلقائي مقفول فيها فمستحيل تاخد نسخة 6.5.
- اللي مش موجود فيها: تنبيهات الأذان والتطبيق اللي قدامك، وطبقة HDMI، وحاجات
  فيترو اللي محتاجة روت. الصلاة والتاريخ الهجري والطقس والمصحف والراديو
  والأناشيد والإعدادات كلها شغالة.
- التثبيت زي العادي بـ Apps2Samsung (وضع المطوّر)، وبعدها افتح
  **Salah Launcher Legacy** من قائمة التطبيقات.
- لو حاجة طلعت مش مظبوطة، صوّر الشاشة وابعت الصورة.
