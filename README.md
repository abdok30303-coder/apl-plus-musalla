<p align="center">
  <img src="docs/banner.svg" alt="APL+ Musalla" width="100%">
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-8.7.17-c9973b?style=for-the-badge">
  <img alt="platform" src="https://img.shields.io/badge/Samsung%20Tizen-6.5%2B-1b1f4a?style=for-the-badge">
  <img alt="ui" src="https://img.shields.io/badge/UI-Arabic%20%C2%B7%20RTL-0b6e4f?style=for-the-badge">
</p>

<h3 align="center">An Apple&nbsp;TV&ndash;style launcher for Samsung Tizen TVs, built around prayer, Quran and daily life.</h3>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#install">Install</a> ·
  <a href="#configure">Configure</a> ·
  <a href="#support">Support</a> ·
  <a href="#credits">Credits</a> ·
  <a href="#عربي">عربي</a>
</p>

---

## Features

**Prayer & worship**
- Prayer times from the AlAdhan API (Egyptian General Authority method by default), spoken short alerts, Hijri date and a countdown to Ramadan, Eid and the last ten nights.
- Quran radio from Cairo through Samsung AVPlay, plus a Quran listening page with online reciters.
- The full Quran text (Uthmani, with tashkeel) in a glass-style Mushaf page: surah and juz' indexes, instant search while you type, tafsir, font and colour options.
- Azkar with automatic counting, a Khatma tracker, a Ramadan cannon sound and a wisdom widget.

**Launcher**
- Apple TV–style Top Shelf, glass look, dynamic sky and 20 compact local wallpapers.
- Home clock with date, optional second time zone, weather (Open-Meteo, no key), tasks with countdowns and personal occasions.
- Control Center, HDMI sources, profiles with a kid lock, screensaver, light mode, backups and a safe mode.
- Optional Vetro root-app bridge for keeping alerts alive behind other apps.
- Light by design: no Mushaf images, timers shared, blur off unless you turn it on.

## Install

> Requires a Samsung Smart TV on **Tizen 6.5 or newer** with Developer Mode on.

1. Download `apl-plus-musalla-v8.7.17.wgt` from [`releases/`](releases/).
2. Install it on the TV with your usual sideload route (Tizen Studio, Apps2Samsung, …).
3. Open **APL+ Musalla** from the TV's app list.

Many changes in [`app/CHANGELOG.md`](app/CHANGELOG.md) are marked *Untested on physical TV*; [`app/TV-TEST.md`](app/TV-TEST.md) is the checklist to confirm them.

## Configure

| What | Where |
| --- | --- |
| Prayer city, weather place, radio stream | `app/js/site-config.js` (defaults: Cairo) or Settings on the TV |
| Support link shown as a QR code | `support.url` in `app/js/site-config.js` |
| Optional API keys (TMDB, YouTube, fanart) | `app/js/keys.local.js` — keep your keys out of commits |

After editing sources, `app/js/app.bundle.js` must be regenerated from `app/js/*.js` (the bundle is what the TV loads). To set the support link and rebuild the package in one step:

```bash
python3 tools/make-support-qr.py "https://your-support-link"
```

## Support

APL+ Musalla is free and open source. If it is useful to you, you can support its development. The same code is in the app under **Settings › Support**.

<!--SUPPORT-START-->
<p align="center">
  <img src="docs/support-qr.png" width="200" alt="Support QR code"><br>
  <a href="https://ko-fi.com/abdulrahmankhalid32781">ko-fi.com/abdulrahmankhalid32781</a>
</p>
<!--SUPPORT-END-->

## Credits

APL+ Musalla is a derivative of **APL Launcher** by Knikt (Gero Corp.). See [`NOTICE.md`](NOTICE.md) for the full list: Tanzil Quran text, fonts, data sources and trademarks.

## عربي

**APL+ Musalla** مشغّل بشكل Apple TV لشاشات سامسونج (Tizen 6.5 فأحدث)، مبني حول الصلاة والقرآن: مواقيت الصلاة وتنبيهاتها، إذاعة القرآن الكريم من القاهرة، مصحف كامل بالتشكيل مع بحث فوري وفهرس للسور والأجزاء، أذكار وختمة، وساعة وطقس ومهام على الشاشة الرئيسية. الواجهة عربية من اليمين لليسار، والحزمة خفيفة بلا صور مصحف.

للتثبيت: نزّل ملف `.wgt` من مجلد `releases/` وثبّته على الشاشة بوضع المطوّر. المدينة الافتراضية القاهرة ويمكن تغييرها من الإعدادات.
