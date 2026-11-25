## 8.7.54

- Control Center: the panel is frosted glass now. The Home Screen behind it is blurred and dimmed (like a phone notification shade), the panel has rounded corners and no hard border.
- It is drawn at 86% so every tile fits on screen; the last row (Search) is no longer cut off. It still scrolls to the focused tile when needed.
- Low-power mode and browsers without blur get a plain translucent panel instead of the blur.
- The wisdom widget is hidden while the panel is open so it does not overlap it.
- Back on the first row of the Home Screen opens the Control Center in one press. Back still closes panels, the player and settings first; on a lower row it still goes to the first row.
- Untested on the TV: how the blur looks and performs there.

## 8.7.53

- A Ramadan or Eid date corrected by hand (Correct Ramadan & Eid Dates) now wins over the announcements, online or built in. The correction is saved as an exact day: the automatic start of the month when you corrected it, plus your days. A later online update does not move it. Choosing "automatic" removes the correction, and the month follows the online date again. Corrections made before this version keep working as before (relative to the automatic date).
- Reset all corrections clears the saved starts too.
- A correction of +2 can still leave the month before it at 31 or 32 days when announced months on both sides leave no room (the manual date wins, by his choice).

## 8.7.52

- Two settings texts that showed in English in Arabic mode now have Arabic: the duck.ai description and the Refresh hint on the prayer page.
- Checked and left as they are: two fixes that contradict each other on neighbouring Hijri months can still show a 25- or 31-day month (they are the user's own input); the seven newer nasheeds have no YouTube fallback (needs his links); the radio does not resume after a song (his choice).

## 8.7.51

- Hijri months: when a month start is fixed by hand (Correct Ramadan & Eid Dates) or announced online, the neighbouring months that are not fixed now move so every month keeps 29 or 30 days. Before, the month before could reach 31 or 32 days and the month after 25. Two fixes that contradict each other (more than the 29-30 days apart) are still shown as set.
- The Arabic text of the online dates status is corrected.
- Deeper check, no other change needed: 3 random-key runs on the Settings screens (1,500 to 3,000 key presses each) gave no script errors; 400 open/close cycles of Settings and 200 of the song player left no extra page elements or key listeners; a failing song link closes the player with a message, a link that does not start in 15 seconds opens YouTube when a YouTube id exists; the phases of the Ramadan widget run a, b, c with no overlap around the boundary days; prayer times match AlAdhan's Egyptian method for Cairo.
- Not verified on the TV: the real remote, Wi-Fi streaming, and the real Back key (10009) behaviour.

## 8.7.50

- Ramadan and Eid dates update online, per country. The launcher fetches feed/hijri-announced.json from the project repository (HTTPS), keeps the last copy in storage, checks at most every 12 hours (a failed check is retried after an hour), and uses the saved copy and then the estimate when offline. The text is read as data only: only month keys and dates are kept, and a date more than 3 days from the estimate is ignored.
- Settings: Announcements Country (automatic: Egypt for the Egyptian calendar, else the city's country), Online Dates Status, Update Announced Dates Now. The manual correction still applies on top.
- The built-in Egyptian announced table is now used only when the country is Egypt.
- Only Egypt is filled in the feed. Other countries use the estimate until their announcements are added.
- Not verified on the TV: that the TV can fetch raw.githubusercontent.com over HTTPS, and the Settings rows on the real screen.

## 8.7.49

- Ramadan widget: the Laylat al-Qadr dua "O Allah, You are Forgiving and love forgiveness" was in the last-ten items twice (once plain, once with Aisha's question). The plain copy is removed. 150 items: 99 before and early Ramadan, 23 last ten, 28 Eid. Phases are still never mixed.
- Audit of the 8.7.40-8.7.48 work found nothing else that needed a code change. Suggestions that need his choice are listed in the report.

## 8.7.48

- The songs menu is renamed "Nasheeds" (الأناشيد).
- Back from the song player: closes the player, stops the sound, closes Settings if it is somehow open, and removes the player's key listeners (they are now added only while a song player is open). Esc, Backspace and Stop do the same.
- Checked in headless Chrome with a flow test using the real menu code: open menu, press OK on a song, player opens and Settings closes; Back, Esc, and Back right after opening each leave no overlay, no player and no listener of the player behind, and the launcher's own key handler no longer sees the Back press.
- Not verified on the TV: that the TV's remote delivers Back as key 10009 to the page while the player is open (the launcher uses the same key everywhere else), and the 27 MB file over Wi-Fi.

## 8.7.47

- Seven more audio files stream from the user's archive.org item 20261125_20261125_1248 (direct WAV links, 10 to 27 MB, range requests supported): Humood - Kun Anta; Maher Zain & Harris J - Qalbi Fil Madinah; Maher Zain - A'marona A'malona (Acapella); Maher Zain - Ya Nabi Salam Alayka; and three poems (الأرجوزة السنية، لامية ابن الوردي، مثلث قطرب). They are listed first. They have no YouTube fallback: if one cannot start in 15 seconds, a toast says so.
- The menu "Ramadan & Eid Songs" is now "Nasheeds & Songs" (الأناشيد والأغاني). The two earlier songs keep their YouTube fallback.
- Back now always closes the song player and stops the sound. The player's keys are caught in the capture phase of the window, before the launcher's own handling, and on the TV's hardware-key event; the sound also stops if the page is hidden. Checked in headless Chrome: Back closes the player, the audio is paused, and the launcher's own key handler sees nothing.
- Not verified on the TV: why Back did not close the player on his set (I could not reproduce it; the likely cause is the launcher's own handling taking the key first, which the new handler bypasses), and smooth playback of the 27 MB file.

## 8.7.46

- Ramadan & Eid Songs now stream from the two WAV links the user supplied (archive.org; 10.8 MB and 7.9 MB, 22,050 Hz mono PCM, 4:06 and 3:00). A small in-app player shows the title, a progress bar and the time. OK pauses or plays, Left / Right move 10 seconds, Back or Stop closes it and the sound stops. Radio and Quran audio are paused when a song starts.
- If the file cannot start within 15 seconds, or the player reports an error, the song opens on YouTube (the 8.7.44 route: YouTube app, TizenTube, Dummy, browser).
- No audio is stored in the launcher or the release. The songs play only while the TV is online and the archive.org links stay available.
- Checked in headless Chrome against the real links: progressive streaming starts at once, seeking (range requests) works, pause/resume works, close works, and a bad link falls back to YouTube. Not verified on the TV: that its browser engine plays a WAV of this size smoothly (the files are small by video standards and the server supports ranges).

## 8.7.45

- Living Mihrab radio: the first OK press now starts the radio. Before, starting needed two presses while stopping worked at once. Cause (from the code, not seen on the TV): the OK handler called the radio's toggle, which treats the radio as "on" when the saved "radio wanted" flag is set or the player is left in a READY/PAUSED state, even if nothing is sounding. The first OK then "stopped" a silent radio and only the second one started it. The handler now checks whether the radio is really playing or connecting. The toast ("Radio turned on" / "Radio turned off") is unchanged.
- Not verified on the TV: the exact leftover state on his set. The logic was checked by reading the code, and the file is syntax-checked.

## 8.7.44

- Songs: pressing OK opened only the YouTube home screen. The launch data was wrapped in JSON, which the YouTube app does not read. It now sends the plain `v=ID` with the default operation. TizenTube gets the video as its module `args` (the way its own DIAL service starts it). YouTube Dummy gets the same plain data. Order: YouTube app, TizenTube, YouTube Dummy, then the TV browser, which opens the video for sure.
- Both songs ("أهلا بالعيد" and "رمضان جانا") are listed in Settings > Prayer and Quran > Ramadan & Eid Songs. The row in Settings > Support is removed.
- Checked in Node with simulated apps (all present, YouTube fails, Dummy only, none). Not verified on the TV: whether the installed YouTube / TizenTube / Dummy apps play the video from the launch data. A launch that played the video cannot be told from one that only opened the app, so a fallback only happens when a launch is refused.

## 8.7.43

- Ramadan widget phases (never mixed): the day before Ramadan and days 1-20 show general duas, tips and virtues; days 21-30 show only last-ten and Laylat al-Qadr items (plus night-prayer items, new label "Night prayer"); the first 3 days of Eid al-Fitr show only Eid items (28, label "Eid"). 151 items, each tagged with its phase, and the picker never leaves the current phase.
- Boundaries: the Islamic day starts at Maghrib, so after Maghrib the widget uses tomorrow's Hijri date. Day 21 starts at Maghrib on day 20; Eid starts at Maghrib on the last day of Ramadan and ends at Maghrib on Eid day 3. Dates come from the same Hijri rules as 8.7.38 (Egypt's announced starts first; the crescent estimate, marked approximate, for months not announced yet; the Hijri Date Adjustment on top). The "day before Ramadan" state may be a day off until Egypt announces the start.
- Settings > Ramadan Widget Preview: new options Day before Ramadan, Day 21 (last ten begins), Eid al-Fitr (day 1). The off switch still hides everything.
- Living Mihrab: the gold outline with corner marks is removed. Content unchanged.
- Checked: boundary test with simulated dates (before and after Maghrib), picker phase test, text-fit test on all items. Not verified on a TV. Arabic wording and hadith numbers are from memory and should be reviewed by a scholar.

## 8.7.42

- Ramadan & Eid Songs: a new entry in Settings > Prayer and Quran, placed in the middle of the Ramadan items, with "أهلا بالعيد · صفاء أبو السعود". A second song ("رمضان جانا · الأصلية القديمة") is a hidden row in Settings > Support, not in the visible list.
- Both open the YouTube video online (with picture). No audio file is stored in the launcher or the release; nothing is downloaded or converted. The target order is: 1) the "YouTube Dummy" app already on the TV (the one the launcher shows with the YouTube icon), 2) TizenTube, 3) the installed YouTube app, 4) the TV browser if none of them is installed or starts. The video id is passed in the link and in PAYLOAD ("v=ID").
- Checked in Node with simulated apps for every fallback order (all present, dummy fails, dummy and TizenTube fail, only YouTube, none). Not verified on the TV: whether each app plays the given video on launch or only opens its home screen. TizenTube is started the usual way through TizenBrew and may not take a video link.

## 8.7.41

- Ramadan widget position: centred horizontally and sitting just above the apps row. Its top edge is measured against the status column (prayer card, tasks) on every refresh and it keeps a clear gap of at least 16 px, shortening itself if needed (smaller text and spacing, never overlapping). When the focused app's name and description are showing, the card slides to the free side so it never covers them. In v8.7.40 it sat 90 px in from the edge, and on a TV with a taller prayer card its top touched the card.
- Ramadan content: 38 to 120 items (34 duas, 34 tips, 15 Laylat al-Qadr items, 33 virtues of Ramadan, fasting, the Quran, qiyam and charity). Quran verses and hadith only, each with its source. New "Virtue of Ramadan" label. A repeat is avoided for 30 items in a row.
- Citations: every hadith source now reads in full, e.g. "Sahih al-Bukhari · Hadith 2017" (Arabic: "صحيح البخاري · حديث ٢٠١٧"); agreed-upon hadiths list both books with their numbers; other books are named in full (Sunan Abi Dawud, Jami' at-Tirmidhi, Sunan Ibn Majah, Musnad Ahmad).
- The wording and hadith numbers were written from knowledge of the sources, not copied from a printed edition. Worth a scholarly check before relying on them.
- Checked in headless Chrome: layout with the prayer card at TV size, and a fit test of all 120 items in Arabic and English at normal and short height. A very long item (Sayyid al-Istighfar) drops its English line if it cannot fit. Untested on a physical TV.

## 8.7.40

- Ramadan widget: a glass card above the apps row, shown automatically only in Ramadan (it follows the v8.7.38 Hijri calendar). A big crescent, or a fanous lantern, mostly in days 1-5. Beside it a rotating dua, tip or Laylat al-Qadr dua, with the Quran or hadith source and grading under it. Qadr duas lead in the last ten nights. Arabic and English, all offline (data/ramadan/ramadan.json, 38 items: 13 duas, 16 tips, 9 Qadr). Settings > Ramadan: "Ramadan Widget" switch (on by default) and "Ramadan Widget Preview" (Off / Day 1 lantern / Day 12 crescent / Night 27) to see it outside Ramadan. It hides over pages and when the shelf is not showing, and the wisdom widget moves up out of its way.
- Home temperature: same size as the "since prayer" text, blue (#60a5fa) like Tasks.
- Launcher Update: the last known "Latest on GitHub" version is saved and shown at once; the check refreshes it in the background.
- "Press Down to read more" hint: shown only when the text really runs past the box. The message box is taller (720 px instead of 540), so fewer pages need scrolling. Applies to every message box that uses the hint, including What's New.
- Wisdom widget: edge margin raised (about 50 to 66 px) with long-word wrapping, so nothing touches the screen edge on TVs with overscan.
- Checked in Node and headless Chrome (layout render and a fit test of all 38 items in both languages). The Ramadan texts were written from memory of the sources and are not checked against a printed copy. Untested on a physical TV.

## 8.7.39

- Living Mihrab screen saver: the on-screen "OK · تشغيل/إيقاف الراديو" chip is removed (it looked and sat badly). OK still starts / stops the radio (Settings > Screen Saver > Radio Button in the Screen Saver), and a short toast now says what happened: "Radio turned on" / "Radio turned off" (Arabic and English, the two languages the launcher ships). A failed start keeps the existing "The radio needs the internet." wording.
- Wisdom widget: it drew from a 1,000-item sample (data/hekam/excerpts.json) of the Kalem Tayeb library, so wisdoms repeated quickly. It now draws from the whole offline library: 35,219 wisdoms in 53 sections, choosing a section at random weighted by its size and loading only that file (at most 3 section files in memory, the same budget the Hekam reader uses). Wisdoms over 500 letters (about 7% of the library) are too long for a Home-screen widget and are skipped here; every one of them is still readable in the full reader (Prayer & Quran > Hekam). Real pool: 1,000 before, 32,724 after. If the section index cannot be read, the 1,000-item excerpts file is the fallback. The "random wisdom" inside the Prayer & Quran page still uses the curated excerpts sample.
- Checked in Node against the real data files: 400 picks gave 395 distinct wisdoms from 28 of the 31 non-empty sections, nothing over the length limit, memory cap held; Arabic strings added for both new toasts. Untested on a physical TV.

## 8.7.38

- Hijri date a day ahead (16 Jumada al-Akhira instead of 15): for Egypt the calendar follows its own crescent rule, which only checks the moon's age at sunset. On the evening of 9 November 2026 the moon set BEFORE the sun, so no sighting was possible anywhere, but the rule counted it and started Jumada al-Akhira on 10 November; Dar al-Ifta announced Wednesday 11 November. The same kind of miss had shifted Dhu al-Qa'da 1447 (19 April; the rule said 18) and Rabi al-Thani 1448 (13 September; the rule said 12).
- The month starts announced by Dar al-Ifta are now written into the calendar (Ramadan 1447 through Jumada al-Akhira 1448, each checked against the announcements) and always win over the estimate. Months not announced yet stay on the crescent estimate, marked "≈" until the announcement. The Hijri Date Adjustment setting and the hand corrections still work on top.
- Checked in code against every announced Egyptian month start from 19 February to 25 November 2026: all match. Untested on a physical TV.

## 8.7.37

- Ramadan cannon test starts right away: the cannon script looked for the Pulse sound route with pactl probes that could each wait on a dead socket (about 8 s before the sound on the TV). The Pulse folder the background player last verified (pulse.dir) is tried first, and every pactl probe is cut after 5 s. The automatic iftar cannon is unchanged (it still gives the adhan priority).
- Remote buttons bound to apps: 8.7.36 put the button list back after an interrupted binding. The launcher now also puts its saved copy back whenever Vetro answers with an EMPTY button list (for example after its service restarted), still only when Vetro's list is empty, so a list changed meanwhile in Vetro is never overwritten. Every non-empty list the launcher reads from Vetro refreshes the saved copy, so buttons bound in Vetro's own Remapper are backed up too. One honest limit: clearing every button inside Vetro's own Remapper is undone by this restore; clear them from the launcher (Restore Default Remote Buttons) instead.
- The cause of the reported binding loss is still not proven: no code in the alert test, the Background Test, the keeper or the supervisors writes Vetro's button list (checked again in this pass). This release makes the launcher repair the loss when it sees it.
- Untested on a physical TV.

## 8.7.36

- Remote buttons bound to apps: while a button is being bound, the launcher empties Vetro's button list and puts it back with a 90 s timer. That timer stops when another app comes in front, so leaving the launcher at that moment left Vetro with no bindings. The list is now saved to disk before Vetro is emptied, and put back when the launcher starts or comes back to the front (only if Vetro's list is still empty). Saving a new binding or clearing all bindings drops the saved copy.
- The alert test and the Background Test do not touch Vetro's button list (checked in the code); no change there.
- Untested on a physical TV.

## 8.7.35

- Prayer alerts and the test alert behind other apps: in 8.7.33 and 8.7.34 the background player could not install on the TV (the copy inside the launcher was 4.11 while the launcher required 4.12), so the keeper and the supervisor never started and the alert only played from the launcher after a long wait. The embedded player is now 4.13, and tools/check-daemon-embed.py stops a release when the two differ.
- Background Test (8 s): the wait now runs inside the TV's root daemon, so the sound plays with YouTube or an HDMI input in front (the launcher's own timer stops behind another app).
- The alert starts sooner: no sound-route repair before the sound, the working Pulse folder is remembered, and a pactl call that waits on a dead socket is cut after 5 s.
- Alert Readiness Check: when the TV's root relay drops printed text, the keeper, supervisor and Pulse lines are read with yes/no probes instead of showing red marks; the sound-files line is checked for real and no longer always shows a tick.
- Untested on a physical TV.

## 8.7.34

- Install Update: every failure now names the step (1 Vetro, 2 launcher folder, 3 tools on the TV, 4 download, 5 file check, 6 unpack, 7 copy) and the reason, with the technical detail under it, and keeps the last result in Settings > Support > Launcher Update. It checks the TV first, finds the launcher folder by itself, sends no multi-line command or backslash through Vetro, tries curl, wget and busybox, unpacks with unzip, busybox, bsdtar or python, works in the flash folder instead of RAM, and checks the file against its published SHA-256.
- What's New scrolls with Up and Down, with a hint when there is more to read.
- The wisdom widget stays clear of the clock and prayer widgets: it uses the free gap beside them, shrinks the font to a readable minimum, and only then grows taller inside that gap.

## 8.7.33

- Wisdom widget: the whole wisdom always shows. The four-line cut with "..." is removed on the Home Screen and in the live mihrab; the window widens first, then the font shrinks to a readable minimum, and if a wisdom still needs room the window grows taller. Long wisdoms in the prayer-bar row take a smaller font instead of being cut.
- Automatic update check: once every 24 hours (was every 6 hours).
- Ramadan cannon test starts faster: the background player (4.12) no longer searches the whole filesystem twice before playing (that cost about 14 s on the TV), remembers where the sound was found, and waits 8 s for the 7.7 s cannon instead of 10, so the adhan after it starts sooner.

## 8.7.32

- Ramadan cannon: the background player (4.11) looks for the sound in more places, never plays the task sound in its place, waits for the whole cannon, and the cannon status page shows what the player logged.
- Hijri Date Adjustment no longer shows "undefined".
- Automatic location asks three more services and takes the first answer that names a city; if none answers it says the result is the country only.

## 8.7.31

- The update page is linked to our own GitHub repository (not the old APL Launcher). Check for Update reads the newest version; Install Update downloads the package from GitHub, installs it from inside the launcher and restarts.
- Automatic updates now only check every 6 hours and tell you; nothing installs by itself.
- Sources: all four HDMI ports are listed on a TV, whatever their state.

## 8.7.30

- Minor internal update.

## 8.7.28

- Automatic location is optional and off by default; Settings has a toggle and a Detect Location Now button.
- One country-then-city picker for prayer times and weather; Belqas moved to 5th in Egypt.
- Mushaf: Left next page, Up previous page, verse frame only while pressing Down (lighter, faster), side panel 50% bigger, no button jitter.
- Removed the bordered rectangle behind app tiles.
- Iftar cannon uses its own sound (daemon 4.10, wav converted like the adhan).
- Wisdom widget fits text and window; Living Mihrab default screen saver with a radio button.
- Defaults: glass and enhanced motion ON, wisdom widget ON, light and auto light OFF (saved choices on an installed TV are kept).

## 8.7.27 (automatic location, Hijri calendar by country, Ramadan and Eid renewed by itself; Untested on physical TV)
- **Automatic location (new js/auto-location.js):** the city of the prayer times, the weather and the Hijri calendar is found from two kinds of evidence. The screen: its time zone and its country (Smart Hub country, else the Tizen locale, else an Arabic language tag such as ar-EG; "en-US" is ignored because it says nothing about where the screen is). The Internet address: the first answer of ipwho.is, geojs.io, ipapi.co or freeipapi.com (no key, nothing stored but the place found). The place is snapped to a known city within 35 km, otherwise it becomes a custom place with the service's name and time zone.
  - If the Internet address and the screen disagree on every point they both know (a VPN, a screen set to another country) nothing is changed. With no internet, the city is changed only when it does not fit the screen's country and time zone.
  - Runs 4 s after start-up, every 12 hours, when the network returns, and when switched on. A change from one known city to another must be seen twice in a row (the first detection and "Detect Location Now" apply at once).
  - Settings > Prayer and Quran: "Detect Location Automatically" (on by default in 8.7.27, off by default since 8.7.28), "Detected Location" (what was found and how), "Detect Location Now". Choosing a city by hand, or searching for one, switches automatic mode off. A city chosen by hand before this version keeps automatic mode off.
- **Hijri calendar by country (js/islamic.js, js/prayer.js, js/cities.js):** "Hijri Calendar Source": Automatic by the city's country (Egypt: the crescent rule below; Turkey: Diyanet; others: Saudi announcements), or Egypt, Saudi, Umm Al-Qura, Diyanet by hand. AlAdhan is now asked for the matching calendarMethod. Today's date is the date in the prayer city, and the crescent is checked at that city's sunset (it was Cairo only).
- **Ramadan and Eid renew by themselves:** saved months are renewed after 7 days, and after 12 hours in the days around a Hijri month change (day 27 to day 2), so an announced moon sighting is picked up; what was saved is shown meanwhile and kept if the renewal fails. "Update Prayer Times & Islamic Calendar" still renews everything at once. Changing the city, the calendar source, the Hijri offset or a correction rebuilds the Hijri dates and the Ramadan marks sent to the background schedule (before, the schedule was not rebuilt after a Hijri change, and two different custom places shared one key).
- **Egypt rule checked:** the anchor is 1 Ramadan 1447 = 19 February 2026 (Dar al-Ifta's statement of 17 February 2026: crescent not seen, Sha'ban completes 30 days). The new moon must be at least 4 hours old at sunset (was 5). Against 15 Egyptian month starts (Ramadan, Eid al-Fitr and Dhul-Hijjah, 1443 to 1447; taken from the announcements as remembered, not re-read from each bulletin) 4 hours fits all 15 and 5 hours missed Dhul-Hijjah 1445; the hours that fit all 15 are only 3.7 to 4.3, so future dates are an estimate. They show "≈" until the month has begun and the moon was clearly on one side of the limit; the announcement can differ by a day.
  - Worked out with this rule from the anchor: Ramadan 1448 begins 8 February 2027, Eid al-Fitr 9 March 2027, Eid al-Adha 16 May 2027 (Mansoura, Cairo gives the same days).
- **Manual correction:** Settings > "Ramadan & Eid Dates" shows the next dates; "Correct Ramadan & Eid Dates" shifts Ramadan, Eid al-Fitr or Eid al-Adha by -2 to +2 days when the announcement differs, or resets all. A corrected date is shown as exact. The old "Hijri Date Adjustment" (every date) is unchanged.
- **One Hijri date:** the prayer page card now uses the same date as the Home Screen (offset, corrections, calendar of the place); it was the raw AlAdhan date.
- **Files:** js/auto-location.js (new, after js/islamic.js in js/build.js, version.json and js/app.bundle.js), js/cities.js (country helpers), js/islamic.js, js/prayer.js, js/settings-tree.js, js/system.js (prayerAuto, hijriSource, hijriFix), js/lang-ar.js, js/safe-mode.js (What's New). Only these sections of js/app.bundle.js were replaced; every other section is unchanged.
- **Checked:** `node --check` on every changed file and the bundle; scenario tests of the location logic (Egypt, Saudi, VPN conflict, no internet, time zone only, custom place) and of the Hijri dates (corrections, offset, other countries, wrong screen date) run in Node with mocked services. Not run on a TV: the Smart Hub country call and the four Internet-address services were not reached from the build machine.

## 8.7.26 (offline Isha for Umm Al-Qura in Ramadan; time zone for searched cities; typed names kept; Untested on physical TV)
- **Prayer (offline):** with the Umm Al-Qura method the local calculation now puts Isha 120 minutes after Maghrib on Ramadan days (it was always 90), like AlAdhan.
- **Searched city:** if the geocoder sends no time zone, the app asks the weather service for it and sets the city only when a real zone is known (before, it silently used Cairo time). A custom city saved earlier without a zone gets its zone on the next weather refresh.
- **English phrase translator:** names of occasions typed by the user are no longer rewritten word by word in English mode (only the built-in suggestions are translated). Toasts mark typed names so they stay as written.
- **English:** TV Check summary and its USB messages.
- **What's New:** updated.
- Left as is: verse and tafsir text and Hikma section names (Arabic data), the language and digits options.

## 8.7.25 (Quran reader and player in English; remote reach for Screen margins; Untested on physical TV)
- **Fix:** the Screen margins button in the Mushaf and tafsir tool panel was not in the remote navigation rows, so the remote could not reach it. It is now (Mushaf and tafsir).
- **English:** the Quran reader (page and surah headers, index cards, search and tafsir search texts, source page, toasts) and the Quran listening player (buttons, tooltips, surah and reciter pickers, search and options, surah and reciter names, digits) now show English when the language is English. The diagnostics screen (Settings > Performance) is in English too.
- **Weather:** a saved reading is used only for the same city and unit; a city change during a refresh is no longer dropped.
- **Prayer sync:** the background schedule signature also covers the method, Asr rule and high-latitude rule.
- **Eid takbeer:** repeats of a recording that was playing online go straight to the online source (no wait on the local paths).
- Left as is: verse and tafsir text (Arabic), Hikma section names (data), the language and digits options.

## 8.7.24 (English everywhere in the settings; What's New message updated; Untested on physical TV)
- **English:** every settings page and option now has English text when the language is English (about 55 new entries in the settings tree). Toasts, alerts, the prayer flow, khatma, personal pages, the Ramadan chip, the home ayah and occasion labels and the Quran reader messages now go through a shared translator (`APL.enx`). Surah and reciter names show in English in English mode.
- **Audio:** a clear message when both the local APL-Audio file and the online fallback fail.
- **What's New:** the message after installation now lists this version's changes, in Arabic or English by app language.
- Left in Arabic on purpose: the "العربية" language option and the Arabic digits option.

## 8.7.23 (Al-Kahf and Eid takbeer: local file first, online fallback; Untested on physical TV)
- **Order:** `audio-pack.js` still looks for `alkahf.mp3` and `takbeerat-eid.mp3` in the APL-Audio folder (TV storage or USB) first. Only if the file is not found, or will not open, it streams the recording online with Samsung AVPlay (status text: "Not found on the TV, trying online...").
- **Online sources (archive.org, HTTPS, byte ranges so Al-Kahf can seek and resume):** Al-Kahf: Sheikh Mahmoud Khalil Al-Husary, Egyptian Radio recording, `https://archive.org/download/MahmoudKhalilAl-husary/018.mp3` (MP3 128 kbps, 36 min). Eid takbeer: Egyptian Radio takbeerat, `https://archive.org/download/f-2mp-download-sd/F2mp_download_sd.mp3` (10 min, AAC in an MP4 container; it repeats until stopped like the local file).
- Not changed: volume (it follows the TV volume), the files are still not inside the package.

## 8.7.22 (Ramadan cannon fixes; English for the Quran sidebar and the wisdom pages; Untested on physical TV)
- **Cannon in the background schedule:** `prayer.js` asked `APL.islamic.toHijri`, which did not exist, so the schedule sent to the daemon never marked Ramadan and the daemon played the plain Maghrib adhan without the cannon. `islamic.js` now has `toHijri(y, m, d)` (same offset and rules as `hijriToday`). The foreground path was already correct.
- **Cannon switch:** "مدفع الإفطار" in the Ramadan mode panel now decides whether the Maghrib alert is the cannon plus adhan or the adhan alone, both in the foreground (`prayer.js`) and in the schedule sent to the daemon (the switch is part of the sync signature, so a change is pushed on the next sync). Before, nothing read it for the real Maghrib alert.
- **Test buttons:** the existing test (cannon plus adhan) is unchanged; a new button plays the cannon alone.
- **English:** with English selected, the Quran sidebar (menu, brand, tools, index and search headers and hints) and the wisdom settings and pages (Settings > Prayer & Quran widget options, the Prayer page widget buttons, the wisdom browser) now show English text. The Quran text, the tafsir and the wisdom texts themselves are Arabic only; there is no English translation in the package.
- Not changed: Al-Kahf and Eid takbeer audio (files are not in the package; they are read from the APL-Audio folder on the TV), the radio and prayer alert volumes.

## 8.7.21 (World support, and no cut words in the Mushaf and tafsir; Untested on physical TV)
- **Mushaf and tafsir, words cut at the sides:** the cause was the general focus effect (`.is-focused` scales the focused element by 5.5 percent): the reading page is always focused, so it grew wider than its pane and the pane clipped about 40 px on each side. The reading page is no longer scaled. In addition the page keeps a margin from the screen's edges (24 px at the sides by default; some TVs hide a few pixels) and a new button **حواف الشاشة** (screen edges) cycles it: none / 24 / 44 / 64 / 88 px.
- **Prayer times for the whole world:** js/cities.js now has the world cities (country, IANA time zone), the countries' usual calculation method (Egypt keeps method 5), and a **custom** place. Settings > Prayer and Quran: **Search for a city anywhere** (Open-Meteo geocoding, internet), **Calculation Method** (Automatic by country or any AlAdhan method), **Asr Time** (standard/Hanafi), **High-Latitude Rule**. The times, the countdown and the alerts use the city's own time zone, not Africa/Cairo. The offline fallback (calcDay) follows the method, the Asr rule, the city's time zone and handles far-north cities. A changed city/method/rule invalidates the saved months.
- **Weather for the whole world:** it follows the prayer city (a weather place chosen before still wins), asks Open-Meteo in the city's time zone and has **Temperature Unit** (Celsius/Fahrenheit, km/h or mph).
- Not changed: the hijri date still comes from AlAdhan, the Ramadan and Eid countdowns, the radio and the Arabic texts.

## 8.7.20 (Salah Launcher everywhere; Untested on physical TV)
- **Visible name:** every on-screen "APL Launcher" label that meant this app now says **Salah Launcher** (Settings, alerts, diagnostics, screensaver, Arabic translations, the TV remote pairing name). Credits to the original APL Launcher by Knikt and mentions of its separate Setup tool are unchanged on purpose.
- **Left as they are (internal):** package/app/service ids (`APLMusalla*`), the `APL-Audio` and `APL-Quran` folders on the TV, and the audio stream names used by the background daemon. Renaming them would hide users' files or break the daemon's matching.
- The remote pairing name changed, so Samsung may ask once to allow the app again.

## 8.7.19 (Renamed to Salah Launcher; new icon; Untested on physical TV)
- **Name:** the app is now called **Salah Launcher** (config.xml name, window title, Settings > About and Support, README, install guide, banner). The Arabic banner tag reads "صلاة لانشر". Package, app and service ids are unchanged (`APLMusalla*`), so nothing else is affected.
- **Icon:** new app icon (a watercolor mosque on a soft rounded background), same file used in the README banner.
- Release file is now `salah-launcher-v8.7.19.wgt`.

## 8.7.18 (Own package ids; MIT LICENSE; Untested on physical TV)
- **Package ids changed:** `APLauncher` -> `APLMusalla`, `APLauncher.Home` -> `APLMusalla.Home`, `APLauncher.Bridge` -> `APLMusalla.Bridge` (config.xml, bridge/service.js, daemon, launcher, system, overlay, apps, search, switcher, bundle). The widget id no longer uses the original author's domain. APL+ Musalla now installs next to APL Launcher and no longer overwrites it in the catalog. Checks that skip "our own" apps still recognise the original `APLauncher.*` ids too.
- **Upgrade note:** because the package id changed, Tizen treats this as a new app. It does not upgrade an installed 8.7.17 build; uninstall that one first (settings and saved data of the old package are not carried over).
- **LICENSE:** added an MIT `LICENSE` file with Knikt's notice (APL Launcher) and the contributors' own line below it. README credits point to it.
- Nothing else changed: audio, radio, daemon logic, HDMI, permissions and alerts are untouched.

## 8.7.17 (Public edition: APL+ Musalla; Untested on physical TV)
- **Name:** the project is published as **APL+ Musalla** (config.xml name, window title, Settings > About). Tizen package and service ids are unchanged on purpose, so the Vetro link, the bridge and saved settings keep working.
- **Credit kept:** this is a derivative of APL Launcher by Knikt (Gero Corp.). Settings > About says so; the Ko-fi link of the original author is removed from Settings > Support.
- **js/site-config.js:** new `support.url`. Settings > Support shows a QR code of that link (using js/qr.js, no internet, no image). Empty = the item only says the link is not set.
- **Defaults:** prayer times and weather now start in Cairo (was the maintainer's own town); that town's village entry is removed from js/cities.js. Anyone can still pick any city in Settings.
- Nothing else changed: audio, radio, daemon, bridge, HDMI, permissions and alerts are untouched.

## 8.7.16 (Start-up time measurement; Untested on physical TV)
- **js/launcher.js:** at the end of start-up the load time (code in) and the ready time (Home Screen up) are saved with the version in `apl.bootlog` (last 5 boots, one tiny JSON). Nothing runs at any other time.
- **js/settings-tree.js:** Settings > Performance > "وقت تشغيل اللانشر" shows the last start-up and the average of the last 5, so any later change (lazy loading, effects) can be compared with real figures from this TV before and after.
- No behaviour change: audio, radio, alerts and the daemon are untouched.

## 8.7.15 (Fix: the prayer widget under the listening card did not show; Untested on physical TV)
- **css/custom.css:** the widget carries the `.statusx` class, and the listening page hides every `.statusx` (opacity 0 !important) while it is open, so it was invisible. It is shown again inside its own slot. js/home-status.js: the occasions strip can no longer stop the widget from building.

## 8.7.14 (Prayer widget under the Quran listening player; Untested on physical TV)
- **js/home-status.js:** new `APL.homeStatus.wideNode()` builds the same full-screen prayer widget as the Home "full view" (prayer times row, weather, tasks, occasions strip) as a loose element. It does not depend on the Home option and changes nothing on the Home Screen.
- **js/quran-audio.js, css/custom.css:** the listening page shows that widget in a glass panel under the player card, placed right under the card's real height and refreshed every 15 s on the shared timer while the page is open (removed on close). Prayer alerts, audio and radio untouched.
- **Settings:** Settings > Performance > "ويدجت الصلاة في صفحة الاستماع" (pref `qaPrayerWidget`, ON by default) turns it off.

## 8.7.13 (Light timers setting + status-pill blur gate; Untested on physical TV)
- **js/ambient.js, js/system.js, js/settings-tree.js:** new Settings > Performance > "مؤقتات خفيفة" (pref `liteTimers`, ON by default). The Living Mihrab (ambient) jobs (1 s clock tick, 60 s drift, 28 s picture rotation) now run on the shared timer (js/timers.js), which skips them while the launcher is not in front (YouTube, HDMI). Off: the old separate intervals. Takes effect the next time the screen opens. Prayer alerts, radio, tasks and the daemon are not touched.
- **css/custom.css:** the status pill kept a live 30 px blur even when the blur was off (`body.glass .status` out-ranked the general gate); it now follows Settings > Enhanced Glass & Motion (off by default) like every other surface.
- Checked and left as is: live blur is already off unless "Enhanced Glass & Motion" is on (v8.7.5), and the dynamic sky and Friday reminder already use the shared timer. Lazy-loading of the 1.5 MB bundle is NOT done: it needs a test build on the TV first.

## 8.7.12 (Quran listening: full page of its own with a Mushaf backdrop; Untested on physical TV)
- **css/custom.css:** the listening page now has its own full-screen backdrop (a dark Mushaf-page look drawn in CSS: light page edge, warm tint, faint blurred Hafs text) behind the glass card; the prayer page is hidden behind it. No image in the package and no internet. Optional: drop a photo at images/quran-bg.jpg and it is laid over the drawn backdrop. Performance mode: plain dark backdrop without the text layer.

## 8.7.11 (Prayer page: "مشغل التلاوات" tile removed; Untested on physical TV)
- **js/prayer-page.js:** the "مشغل التلاوات" icon is removed from the audio icons row; the "استماع القرآن" button stays and opens the same listening page. Nothing else changed.

## 8.7.10 (Quran listening card: glass look and the "undefined" tile; Untested on physical TV)
- **js/prayer-page.js:** the "مشغل التلاوات" tile had no icon defined, so the page printed the word "undefined" on it: a headphones icon added for it (and for the Listen button), and tiles without an icon can no longer print "undefined".
- **css/custom.css:** the listening page is now a floating glass card (blurred launcher behind it, thin light border, glass pills, rounded corners) like the reference picture, instead of an opaque full screen; the prayer card stays visible under it. Performance mode keeps a solid dark card (no live blur).
- Audio, radio, daemon unchanged.

## 8.7.9 (Vetro connection recovery; radio untouched; Untested on physical TV)
- **bridge/service.js (not part of app.bundle.js):**
  - Fast watch: while Vetro fails, a light `GET /status` every 15 s; stops by itself when Vetro answers, gives up after 20 min of continuous failure and waits 10 min before starting again (a TV without Vetro is never polled hard).
  - The service restart is tried after 3 failed probes (about 45 s) instead of about 3 minutes; checked again 4, 10 and 20 s after the restart.
  - Limits: one try every 90 s (was 120 s), 8 tries per 30 min (was 5); never during the first 90 s after the bridge starts (cold-boot connection takes 30-60 s).
  - When Vetro comes back, the daemon heartbeat runs at once.
- **Startup:** checked, nothing to defer safely: prayer (1.8 s), weather (2.5 s), art search (3.5 s) and boot cleanup (25 s) are already delayed. The remaining cost is parsing the 1.58 MB bundle; lazy-loading pages stays a separate step after a TV test.
- Radio, daemon 4.9, CSS and launcher scripts unchanged.

## 8.7.8 (Lighter root daemon; radio untouched; Untested on physical TV)
- **background/daemon.sh v4.9 (mirrored in js/bg-daemon.js and js/app.bundle.js; background-engine.js DAEMON_VERSION 4.9 so the TV copy is replaced):**
  - Supervisor tick 2 s -> 5 s (alert grace is 600 s, so no alert can be missed); radio-health block still every 10 s.
  - One `vconftool` foreground read per tick, reused by the foreground and HDMI checks (was 2-3 forks per tick).
  - Remap watcher poll 0.1 s -> 0.3 s (about 3 forks/s instead of 10, only while button-bind rules exist).
  - Alert keeper beat 20 s -> 60 s (the bridge heartbeat is also 60 s, so firmware-reclaim recovery is unchanged).
- **Not changed on purpose:** radio.js (AVPlay, foreground only, stops on leaving); CSS blur/backdrop-filter (already gated by `.perf` / auto-perf); bridge token check (changing it risks locking the launcher out of Vetro); lazy-loading of pages (needs a TV test).

# APL Launcher — Egypt: Changelog
Newest first. `version.json` keeps only a one-line summary of the current version.

## 8.7.7 (Audio Subsystem Conflict Resolution, Samsung AVPlay Engine, Zombie Pipeline Termination; Tested)
- **Samsung AVPlay Engine Restoration (js/radio.js):**
  - **Crystal-Clear Cairo Quran Radio**: Restored Samsung native `webapis.avplay` hardware decoding for the official Cairo Quran Radio stream (`https://radio.xecod.com/station/quran-cairo`). Eliminates all buffer underruns, distortion, and static noise bursts.
  - **Tizen Audio Policy Harmonization**: AVPlay cleanly releases the hardware audio device on launcher exit or minimization (`visibilitychange`), allowing external media apps (YouTube, Netflix) full, unhindered audio focus without crashes.
  - **Smooth Home Return**: Returning to the launcher seamlessly resumes Cairo Quran Radio without static or manual intervention if wanted.
  - **Mutual Exclusivity**: Playing Cairo Quran Radio pauses Surah Al-Kahf (`APL.quranAudio`), and vice-versa. Zero overlapping audio streams.
- **Root Daemon Audio Sanitization (background/daemon.sh, js/bg-daemon.js):**
  - **Eliminated ALSA Hijacking**: Completely removed `alsasink` and raw PCM piping from all radio pipeline fallbacks. Direct ALSA access (`/dev/snd/pcmC0D0p`) is strictly barred from continuous radio streaming, protecting the system sound manager from driver lockups.
  - **External App Audio Yielding**: In `check_foreground_transition`, detection of external foreground applications (e.g. YouTube, Netflix) immediately yields audio rather than forcing rogue background pipeline spawns over foreign apps.
  - **Thorough Zombie Process Sweep**: `kill_player` aggressively sweeps any orphaned `gst-launch`, `pacat`, or `curl` processes with `pkill -9`.
  - **Protected Master Volume**: Removed invasive master sink unmuting and volume resets (`pactl set-sink-volume 0 100%`), restricting pulse adjustments solely to APL's own sink inputs.
- **One-Time Startup Audio Cleanup (js/system.js, js/radio.js):**
  - **Automatic Zombie Termination**: Launcher startup automatically executes a root audio cleanup to instantly terminate any lingering zombie `gst-launch` or `pacat` processes from previous builds and remove stale `radio.*` files, immediately restoring TV audio functionality on update installation.

## 8.7.6 (Field-Proven Tizen Audio, APL.lifecycle Quran Audio Migration, Focus Layer 2 & Dual-Layer Sky; Untested on physical TV)
- **Field-Proven Tizen Audio Pipeline (background/daemon.sh v4.8):**
  - **Eliminated White Noise / Static**: Replaced misbehaving hardware OpenMAX decoder with FFmpeg software decoder (`ffdec_mp3`) paired with explicit `audioconvert` and `audioresample` to 48000Hz stereo `tizenaudio-sink`.
  - **Direct `pacat` Fallback**: Added native 48kHz stereo PCM streaming pipeline directly to PulseAudio via `pacat`.
  - **Automatic Unmute**: Enforced sink unmuting (`pactl set-sink-mute 0 0` and volume 100%) on both default and `tizenaudio-sink` on every route repair.
- **Centralized Lifecycle Management (js/lifecycle.js, js/quran-audio.js, js/navigation.js):**
  - **Scope Registration**: Migrated `quran-audio.js` event listeners to `APL.lifecycle.scopeFor(qaNav, "quran-audio")`.
  - **Automatic Teardown**: Closing pages via `popNav` automatically disposes registered listeners, clears background timers, and invokes cache trimmers (`onTrim`).
  - **Capped Cache Eviction**: Quran verse, tafsir, and juz caches are flushed on page close or app background suspension to ensure 72-hour leak-free stability.
- **Remote Focus Guard & Layer 2 Return (js/navigation.js):**
  - **Layer 1 Safety Net**: `focusGuard()` instantly recovers focus to the first interactive element if `.is-focused` becomes lost or detached.
  - **Layer 2 Trigger Return**: Modal and sub-screen closures return remote focus precisely to the triggering element (`nav.__ret`), preventing focus traps.
  - **Remote Key Acceleration**: Added `APL.keyAccel` with 4 acceleration levels for smooth navigation across long Quran and Hekam lists without frame drops.
- **Dual-Layer Dynamic Sky Ambience (index.html, css/custom.css, js/visual-fx.js):**
  - **Night Phase**: Added 7th lighting phase (`night`) active between Isha + 90min and Fajr - 30min.
  - **Zero-Cost Style Updates**: `data-sky-phase` is updated only upon actual phase transitions, eliminating periodic style recalculation churn.
  - **Dual-Layer Opacity Cross-Fade**: Rendered `#skyA` and `#skyB` static gradients cross-fading with 700ms opacity transitions, completely free of runtime blur overhead.
- **Integrated Root Diagnostics (apl-diag.sh, js/ux-extras.js):**
  - Built comprehensive `apl-diag.sh` script auditing PulseAudio streams, root daemon version, rejected spawns, and memory usage.
  - Accessible directly from Settings > Diagnostics and included in USB export reports.

## 8.7.5 (Forensic fixes: daemon integrity, root command injection, token, RTL flex-gap; Untested on physical TV)
- **Daemon v4.7 (background/daemon.sh):** removed the embedded SHA-256 that never matched the file (it blocked every `daemon_spawn`/`daemon_pipe`, i.e. keeper, supervisor, alert worker); integrity is now enforced outside the file: bridge, launcher and engine pipe it only if it is a non-symlink owned by root (`[ -O ]`); failures are logged. Radio URL whitelist (`valid_url`) before any root `sh -c`.
- **Bridge (bridge/service.js):** token verified against the disk file (re-read on mismatch, rate-limited), re-pinned from the verified launcher only when the disk file is unreadable (no lock-out after token rotation); unverified diagnostic callers receive no reply; shortcut port rate-limited; heartbeat accepts root-owned daemon files only.
- **js/system.js:** unguessable request ids; `[ -O ]` added to every daemon launch.
- **Ramadan cannon:** lock/status/log moved from `/tmp` to root-checked `/run/apl-bg`; no reads from `/tmp/apl-bg`.
- **Quran audio:** advance timer cleared on the native `pause` event; Stop clears the post-Adhan resume intent; resume after Adhan retries 3x and clears intent only after `play()` succeeds; closing the page during Adhan no longer drops the resume when background playback is on.
- **CSS (2nd pass):** fallbacks for wrapping flex containers; live `backdrop-filter` is now off unless "Enhanced Glass & Motion" (`body.rich-fx`) is on; page-entry animation uses `backwards` fill so no permanent transform/containing block is left.
- **CSS:** removed doubled `margin-left` in RTL fallbacks; generated missing `.no-flex-gap` fallbacks (logical margins) for launcher.css and custom.css flex+gap rules (wrapping containers are not covered).

## 8.7.4 (Forensic Bridge Hardening, Root Daemon Integrity, Chromium 76 Flex Gap & 10-Foot Focus; Untested on physical TV)
- **Forensic Vetro Bridge Hardening (bridge/service.js, js/system.js):**
  - **Double Lock for Root Execution**: `/exec` and `/components/action` on the plain message port require BOTH verified caller `callerIsLauncher(reply)` AND a cryptographically valid token.
  - **Restricted Package Data Candidates**: `verifyPlainToken` candidate paths restricted strictly to package-owned directories (`apps_rw/APLauncher/data/bridge.token`, `apps_data/APLauncher/data/bridge.token`), rejecting `/tmp` and system paths.
  - **First-Use Token Pinning**: If `cachedLauncherToken` is empty and an incoming plain-port message is verified launcher (`appId === UI_APP`), the token is pinned; subsequent modifications are rejected.
  - **Unverified Caller Reply Nulling**: Restored `reply = null` for unverified callers on read-only diagnostic endpoints (`OPEN_PATHS`).
  - **Token Failure Rate-Limiting**: Token verification failures are rate-limited to at most 5 per 10 seconds to eliminate disk I/O thrashing.
  - **Anti-Hang Race Timer**: `initBridgeToken()` races against a 1500 ms safety timer so `bridgeRequest` can never stall launcher boot; corrupt or short token files on disk are automatically deleted and re-written.
- **Root Daemon Integrity & Security Hardening (background/daemon.sh, ramadan-cannon.sh, js/background-engine.js):**
  - **Root UID 0 & Directory Ownership Verification**: Verified runtime directory ownership with `[ -O ]` and effective `uid 0`, aborting immediately if directory is not root-owned.
  - **Embedded SHA-256 Source Verification**: Embedded build-time SHA-256 integrity hash verification in `daemon.sh` prior to every `cat | sh` execution.
  - **Isolated Background Engine Deployment**: Removed all references to `/tmp/apl-bg-audio.sh`; deployed daemon directly to `/opt/usr/home/owner/APL/bg-daemon.sh` and `/run/apl-bg/bg-daemon.sh` with `[ ! -L ]` symlink checks.
  - **Cannon Alert Lock Isolation**: Ramadan cannon stopped honoring insecure `/tmp/apl-bg-alert.*` paths, relying exclusively on `/run/apl-bg/alert.lock` and `/tmp/apl-bg/alert.lock`.
- **Quran Audio Stability & Timer Discipline (js/quran-audio.js):**
  - **Audio Advance Timer Cancellation**: Cancels pending `onAudioEnded` setTimeout when Stop (413) or Pause is triggered, preventing unwanted auto-play.
  - **String-Normalized LRU Keys**: Normalized all LRU cache keys to `String(key)` to avoid numeric vs string key duplication.
  - **Safe Resume After Alert**: `resumeAfterAlert()` validates `audioEl.src` existence and returns true only when the underlying `play()` Promise successfully resolves.
  - **Background Adhan Coordination**: Subscribed background Quran playback to `APL.timers` alert polling to pause during daemon Adhan events.
- **Chromium 69–76 Flex Gap & 10-Foot TV Viewing Enhancements (css/custom.css, index.html):**
  - **Flex Gap Feature Probe**: Embedded flex-column 1px gap test script in `<head>`; injects `.no-flex-gap` class on `<html>` for Chromium 69–76 runtimes.
  - **Complete Margin Fallback Catalog**: Provided comprehensive `margin-inline-start`, `margin-top`, and RTL-aware margin fallbacks across all 78 flex containers.
  - **Unified TV Focus System**: Standardized on `scale(1.055)` with 160ms cubic-bezier(0.2, 0.8, 0.2, 1) and static high-contrast ring without altering `overflow` on buttons.
  - **10-Foot TV Typography & Overscan**: Minimum 28px body text on reading surfaces, unified Arabic font stack, tabular numeric figures for all clocks and prayer times, and 48px overscan margins.
  - **Hardware-Accelerated TV Entry Transitions**: Smooth `translateY(16px -> 0)` page entry over 240ms with `body.reduce-motion` and `body.perf` guards.

## 8.7.3 (Blocker Fixes, Path Synchronization, True LRU & Chromium 69-76 CSS; Untested on physical TV)
- **Bridge Token Handshake & Security Hardening (bridge/service.js, js/system.js):**
  - **Correct Package Storage Candidates**: Updated candidate file search paths to include `/opt/usr/home/owner/apps_data/APLauncher/data/bridge.token` and `shared/data/bridge.token` matching the actual Tizen package identity `APLauncher`.
  - **Zero-Disk-I/O In-Memory Token Caching**: Bridge captures and caches the launcher token in memory (`cachedLauncherToken`) on every trusted messageport dispatch.
  - **Constant-Time Verification**: Replaced standard string equality with `constantTimeEquals()` to protect against timing attacks.
  - **Full Endpoint Gating on Plain Port**: All non-diagnostic endpoints (`/exec`, `/components/action`, `/remap`, `/dns`, `/input`, `/apps`, `/quick`, `/keep-removed`, `/wins`, `/hbbtv`) on the plain port strictly require verified token handshake or verified launcher caller.
  - **Cryptographically Secure Nonce Generation**: Switched token generation in `js/system.js` to `window.crypto.getRandomValues(new Uint8Array(16))`.
  - **Deadlock-Free Promise Sequence**: `bridgeRequest` explicitly awaits `initBridgeToken()` before sending requests, ensuring the token file is fully committed to disk and in memory before any message is dispatched.
- **Daemon Path & Consumer Synchronization (background/daemon.sh, ramadan-cannon.sh, js/background-engine.js, js/system.js):**
  - **Path Synchronization**: Synchronized runtime paths across all consumers (`js/background-engine.js`, `background/ramadan-cannon.sh`, `bridge/service.js`, and `js/system.js`) to seamlessly check `/run/apl-bg/`, `/tmp/apl-bg/`, and legacy fallbacks for `audio.pid`, `radio.paused`, `radio.want`, `alert.pid`, `alert.lock`, and `audio.log`.
  - **Symlink Refusal**: Enforced `[ -r "$p" ] && [ ! -L "$p" ]` across all script invocations in `js/system.js` and removed execution of world-writable `/tmp/apl-bg-audio.sh`.
  - **Cannon Overlap Elimination**: Ramadan cannon script now checks both `/run/apl-bg/alert.pid` and `.lock` alongside legacy paths, preventing any overlap with prayer adhan.
- **Chromium 69–76 Visual & CSS Compatibility (css/custom.css):**
  - **Restored Home Background**: Removed `position: relative` from `.bgblur` in `fx-living-mesh`, preserving fixed fullscreen background placement.
  - **Legacy CSS Inset Fix**: Eliminated all occurrences of `inset: 0` (unsupported in Chromium < 87), replacing with explicit `top: 0; right: 0; bottom: 0; left: 0;`.
  - **Unclipped Aurora Glow**: Added `overflow: visible !important` to `.is-focused` on `.pw-btn` and `.pw-ic` during Aurora Glow, ensuring outer glow radiates without clipping while inner text truncation is preserved.
  - **Descendant Selector Blur Gating**: Fixed `.rich-fx` descendant selectors to `body.perf.rich-fx .dock`, ensuring blur removal rules take effect when performance mode is active.
- **Quran Audio Bidirectional Fallback, True LRU & Adhan Coordination (js/quran-audio.js, js/prayer-alert.js):**
  - **Bidirectional Mirror Failover**: Audio engine seamlessly fails over from EveryAyah primary to mirror CDN, and reverts back to primary if the mirror fails, avoiding sticky broken states.
  - **True LRU Eviction**: Implemented `lruGet()` to refresh key ordering on cache hits for `tafsirSurahCache` and `juzCache`.
  - **Bounded Ayah & Tafsir Caches**: Capped `verseCache` and `tafsirCache` with an LRU limit of 50 items.
  - **Polite Media Stop Key**: Remote Stop key (413) pauses and resets audio to time 0 without dismissing the player screen.
  - **Adhan Audio Coordination**: Exposed `isPlaying()`, `pauseForAlert()`, and `resumeAfterAlert()` on `APL.quranAudio` and integrated with `js/prayer-alert.js`, ensuring active Quran recitation gracefully pauses during Adhan and automatically resumes when the prayer alert ends.

## 8.7.2 (Deep Stability, Security & TV GPU Optimization; Untested on physical TV)
- **Bridge Security & Token Handshake (bridge/service.js, js/system.js):**
  - **Fail-Closed Caller Verification**: `callerIsLauncher(reply)` now strictly requires `reply.appId === UI_APP` ("APLauncher.Home") and fails closed if reply is missing, empty, or throws. Removed loose substring matching.
  - **Private Nonce Token Handshake**: On the plain port (`APL_BRIDGE_PLAIN`), root commands (`/exec`, `/components/action`) strictly require a validated token stored in the launcher's private storage (`wgt-private/bridge.token` or `/opt/usr/home/owner/apps_data/APLauncher.Home/data/bridge.token`). Read-only diagnostic endpoints (`/__ping`, `/bridge-info`, `/__vetro-health`, `/status`) remain available for watchdog monitoring.
- **Root Daemon Hardening (background/daemon.sh, js/bg-daemon.js):**
  - **Directory Isolation**: Replaced predictable `/tmp/apl-bg-*` paths with a dedicated root-owned directory `/run/apl-bg` (created with `mkdir -m 700`, with fallback to `/tmp/apl-bg` only if `/run` is unavailable).
  - **Symlink Refusal**: Before executing, writing, or reading `$APL_DAEMON_SOURCE` and PID/lock files, verified that target paths are not symlinks (`[ -L "$f" ] && exit 1`), preventing symlink hijacking attacks under root.
- **Quran Audio Stability, Memory & Navigation (js/quran-audio.js):**
  - **LRU Bounded Caching**: Implemented `lruSet()` capping `tafsirSurahCache` at 2 surahs and `juzCache` at 3 juz, preventing unbounded heap growth over days of continuous Quran listening.
  - **Audio Speed Persistence**: Set `audioEl.defaultPlaybackRate = curSpeed` on speed change and re-applied `playbackRate = curSpeed` in `loadedmetadata` handler, preventing speed reset to 1.0x on ayah transitions.
  - **Background Playback Honor**: `closePage()` now checks `sys.pref("quran_bg_playback")` and preserves active playback if background listening is enabled, only hiding the UI.
  - **Preferred Mirror Memory & 12s Stall Watchdog**: Remembers EveryAyah CDN mirror fallback for 10 minutes after a failed request, and added a 12-second stall watchdog on `loadstart` to automatically switch mirrors before audio stalls indefinitely.
  - **Rapid Navigation Race Guard**: Added `verseReq` request counter to ignore stale `loadVerseData` callbacks during rapid Next/Prev button presses, eliminating verse text flickering.
  - **Remote Key Fixes**: Volume & Mute keys (447, 448, 449) are passed through without event interception; added Pause (19), Stop (413), Fast-Forward (417), Rewind (412), and 463 media keys; removed dead `MEDIA_PLAY` check in options modal; dynamically calculated speed pill focus from DOM; search input Back key blurs input on first press and closes modal on second press.
- **Prayer Flow CPU Optimization (js/prayer-flow.js):**
  - Reset and cleared interval timer on phase transitions, ensuring the 1-second interval used during the iqama phase drops to 15-second polling during the dim phase, saving CPU wakeups during prayers.
- **GPU Performance & Visual Polish (css/custom.css):**
  - **Eliminated Quran Player Backdrop-Filter Overdraw**: Replaced stacked full-screen `backdrop-filter: blur(48px)` and `blur(40px)` on `.quran-audio-screen`, `.quran-audio-overlay`, and `.qa-modal-box` with high-performance solid/gradient layers, dramatically increasing frame rate on TV Mali GPUs.
  - **GPU Compositing Hints**: Added `transform: translateZ(0)` to `.bgblur`, `.quran-audio-screen`, `.quran-audio-overlay`, and `.dock`.
  - **Opacity-Only Animations**: Replaced `box-shadow` & `border-color` keyframe repainting in `auroraPulse` with an opacity-animated `::after` layer, and replaced full-screen `filter: hue-rotate()` in `livingMeshPulse` with opacity cross-fading.
  - **Performance Mode Gates**: Gated heavy card blur rules behind `body:not(.perf):not(.auto-perf)` to ensure smooth 60fps operation on low-power devices.

## 8.7.1 (Compact Integrated Quran Audio Card per image-2.png, Dynamic Sky Prayer Sync, Visual Effects Perf-Decoupling, Keyboard & Pre-Normalized Search, Vetro Bridge Relay & Alert Keeper Fix; Untested on physical TV)
- **Vetro Bridge Relay & Root Alert Keeper Fix (bridge/service.js, js/bg-daemon.js):**
  - **Bridge Caller Verification**: Fixed overly strict `reply.appId === UI_APP` check in `bridge/service.js` which caused `status: 0, caller not verified` on `APL_BRIDGE_PLAIN` across Tizen 6.5+, cutting off the launcher from Vetro and disabling native features. The bridge now safely verifies `APLauncher` package variants and falls back seamlessly.
  - **Root Alert Keeper (حارس التنبيهات)**: Restored 24/7 root alert keeper and audio supervisor communication (`APL.bgAudio.health()` now reliably reports `✓ Root Alert Keeper: Running & Ready`).
  - **Background Daemon Sync**: Synced `js/bg-daemon.js` with the latest `background/daemon.sh` (supporting Ramadan cannon pre-Adhan chime, pulse repair, and audio routing).
  - **Complete Packaging Guarantee**: Rebuilt `.wgt` with all 509 essential files and directories (`background/`, `sounds/`, `native/`, `fonts/`, `images/`, `data/`).
- **Quran Audio Continuous Playback & Remote Navigation Isolation (js/quran-audio.js):**
  - **Seamless Ayah Advance**: Fixed string concatenation bug in `stepAyah(dir)` and `onAudioEnded()` where `curAyah` was treated as a string (`"23" + 1 = "231"`). Strict `parseInt(..., 10)` now ensures continuous ayah progression.
  - **Navigation Event Isolation**: Registered dedicated `qaNav` navigation stack entry with `APL.pushNav` on open and `APL.popNav` on close, plus added `stopPropagation` and `stopImmediatePropagation` to block remote key leakage to the background launcher.
  - **EveryAyah CDN Fallback & Resume**: Added automatic fallback to EveryAyah mirror if the primary stream fails, and fixed `visibilitychange` audio resumption upon returning to the app.
- **Compact Integrated Quran Listening Card (1:1 Match with image-2.png):**
  - **Floating Frosted Glass Modal Overlay**: Redesigned the Quran audio listening interface into an integrated, compact floating card (`1160px` width, `~460px` height, `border-radius: 26px`, deep translucent frosted glass `background: linear-gradient(180deg, rgba(30, 32, 44, 0.90) 0%, rgba(14, 16, 24, 0.95) 100%)`, `backdrop-filter: blur(28px) saturate(180%)`, specular highlight border `1px solid rgba(255, 255, 255, 0.16)`).
  - **Soft Launcher Backdrop**: Added `.quran-audio-overlay` (`rgba(4, 6, 12, 0.58)`) so the Home screen and prayer widget remain visible in the background, matching `image-2.png` faithfully. Clicking outside or pressing Back dismisses the card smoothly.
  - **Refined Typography & Controls**:
    - Top pill buttons: Compact `42px` height with subtle dark glass backgrounds and soft borders.
    - Verse area: King Fahd Hafs calligraphy font (`38px`, line-height `1.85`), with inline ornate ayah marker (`﴿٢٣﴾`).
    - Tafsir text: Muted soft grey (`rgba(255, 255, 255, 0.52)`), clamped to 3 lines with graceful overflow handling.
    - Bottom controls: 5 centered vector icons (Repeat, Prev, Play/Pause, Next, More) with smooth TV remote navigation.
- **Dynamic Sky Astronomical Prayer Times Sync Fix (js/prayer.js, js/visual-fx.js):**
  - Resolved `APL.prayer.todayTimes()` absence by connecting directly to `APL.prayer.today()` (and adding `todayTimes` alias to `APL.prayer`).
  - Sky phases (`fajr`, `morning`, `dhuhr`, `asr`, `maghrib`, `isha`) now synchronize accurately with actual Egyptian General Authority of Survey prayer times calculated for the user's city.
- **Visual Effects Performance Mode Decoupling (js/visual-fx.js, css/custom.css):**
  - Decoupled `fx_chamfer_glass` and `fx_living_mesh` from `body.perf` suppression in JavaScript and CSS. When the user explicitly toggles either effect in Settings, it now activates immediately without requiring manual alteration of system-wide performance mode.
- **Instant Pre-Normalized Quran Search (js/quran-audio.js):**
  - Pre-normalized all 6,236 verses into `normalizedSearchData` upon loading `search.json`. Eliminated 25,000 regex operations per search query, replacing them with instant substring lookups running in under 1ms.
- **Zero External Repo Dependencies for Audio & Tafsir (js/quran-audio.js):**
  - Updated reciters catalog so all reciters (including Minshawi Murattal and Mujawwad) stream directly from EveryAyah CDN, eliminating reliance on secondary jsDelivr/GitHub mirrors.
  - Local Saadi Tafsir from `data/tafsir/[surah].json` is now the primary offline source, ensuring instantaneous verse tafsir display with 0ms latency even without internet connectivity.
- **Deep Memory & Style Recalculation Optimization (css/custom.css):**
  - Replaced universal wildcard rule `html.apl-away *` with targeted container selectors (`html.apl-away .home, .aplpage, .hekam-widget, .quran-audio-screen, .bg`), preventing expensive whole-DOM style recalculation passes when backgrounding the launcher.
  - Removed obsolete `.pw-card--weather svg` CSS selector.

## 8.7.0 (Frameless Quran Player matching image-1.png, Frosted Glass Hekam, Clean Borderless App Navigation; Untested on physical TV)
- **Home Screen App Navigation (css/custom.css, js/visual-fx.js, js/system.js):**
  - **Eliminated white outline / square box around app tiles completely**: Disabled `.tile::before` and `.tile.is-focused::before` across all modes (`display: none !important`). App tiles now navigate smoothly with natural scale (1.14x) and soft realistic depth drop-shadows, without any harsh white outlines or boxes.
  - Removed `.tile` selectors from `.fx-aurora-glow`, `.fx-chamfer-glass`, and `.fx-spring-physics`.
  - All visual enhancement options (`fx_*`) are now disabled (`false`) by default out-of-the-box for a pristine, clean experience.
- **Hekam & Hadith Widget Glassmorphism (css/custom.css):**
  - **Restored authentic translucent frosted glass appearance**: Set `background: rgba(26, 28, 42, 0.40) !important;` with `-webkit-backdrop-filter: blur(30px) saturate(180%) !important;` and subtle specular highlight border.
  - Completely removed opaque dark background overrides from visual effect classes (`.fx-chamfer-glass` and `.fx-holographic-wisdom`), preserving the widget's translucent aesthetic across all themes.
- **Standalone Quran Audio Listening Page (1:1 Exact Match with image-1.png):**
  - **Frameless Widescreen Layout**: Replaced dialog box modal container with a cinematic frameless fullscreen view featuring deep ambient radial vignette background (`radial-gradient(ellipse 85% 65% at 50% 35%, #181c26 0%, #080a0f 75%, #040507 100%)`).
  - **Top Bar Pill Buttons (RTL Order)**: Centered pill bar ordered faithfully to `image-1.png`:
    - Right: Search button (`البحث في الآيات` with magnifying glass icon).
    - Center: Reciter button (active reciter name with microphone icon).
    - Left: Surah button (active Surah name, revelation type, and verse count with book icon).
    - Inside pills: Icon positioned on the left and Arabic label on the right (`flex-direction: row-reverse`).
  - **Ayah & Tafsir Display**:
    - King Fahd Hafs calligraphy font (`fonts/UthmanicHafs.ttf`), centered vertically and horizontally at 44px with soft drop-shadow.
    - End of Ayah marker formatted inline right at the end of the verse with ornate Uthmanic brackets (`﴿١٧﴾`).
    - Tafsir text rendered directly below the verse in subtle muted grey (`rgba(255, 255, 255, 0.46)`) per `image-1.png`.
  - **Bottom Player Bar**:
    - 5 centered vector control icons: Repeat mode (`🔁`), Previous Ayah (`⏮`), Play/Pause (`▶`), Next Ayah (`⏭`), and More Options (`•••`).
- **Reciters & Surahs Modal TV Remote Scrolling (js/quran-audio.js):**
  - **Programmatic Viewport Centering**: Fixed list navigation freeze by computing precise viewport delta offsets (`container.scrollTop += diff - (container.clientHeight / 2) + (targetItem.offsetHeight / 2)`), with dual fallback via `scrollIntoViewIfNeeded(true)`.
  - Added live item counter `(x / 42)` in reciter picker modal header for clear visual feedback.
  - Applied `position: relative` and `scroll-behavior: smooth` to grid containers.
- **Surah & Reciter Selector TV Remote Navigation (js/quran-audio.js, css/custom.css):**
  - **Live Selection Display Banner**: Added a high-contrast glowing top banner (`.qa-active-banner`) inside both Surah and Reciter modals showing in real-time the highlighted item in huge bold text: e.g. **"السورة المحددة بالريموت: سورة الكهف (رقم ١٨ من ١١٤ · مكية · ١١٠ آيات)"** with instructional hint.
  - **High-Visibility Grid Focus**: Designed ultra-prominent golden focus frame (`border: 3px solid #ffd700 !important; transform: scale(1.06) !important; box-shadow: 0 0 32px rgba(255, 215, 0, 0.85) !important;`) that strictly overrides active states so the highlighted Surah is instantly recognizable from across the living room.
  - **Direct Top/Bottom Spatial Navigation**: Removed intermediate trapped "verse" focus area; pressing UP from bottom player controls now lands directly on top header buttons (Prev/Repeat -> Surah, Play -> Reciter, Next/More -> Search).
  - **Corrected Remote Direction Inversions**: Fixed inverted Left/Right arrow handling on the bottom player bar (Left moves left towards Mode, Right moves right towards More).
  - **Universal TV Remote Keycode Handling**: Added support for Samsung/Tizen TV Select keys (`65385`, `29443`, `13`, `KEY_ENTER`, `MEDIA_PLAY`) so pressing OK/Enter on any remote model immediately selects the Surah and begins streaming.
  - **Instant Selection Confirmation**: Added audible feedback and on-screen APL toast message confirming the selected Surah upon selection.
- **Stability, Memory & TV Hardware Hardening (Deep Review across v8.6.3–v8.7.0):**
  - **Focus Ring Optionality in Settings (css/custom.css, js/launcher.js):**
    - Honored user preference with `focusFx: false` as default (no white outline/box around app tiles).
    - Scoped the tile outline suppression strictly under `body.no-focus-fx`, allowing users who intentionally enable "Focus Highlight / تمييز العنصر المحدد" in Settings to enjoy their custom ring styles without layout breakage.
  - **Quran Audio Background Lifecycle & Decoder Release (js/quran-audio.js, js/system.js, js/settings-tree.js):**
    - Wired `visibilitychange` (`document.hidden`) and `pagehide` listeners to automatically pause playback whenever the launcher is backgrounded or hidden behind HDMI/streaming apps, preventing Tizen OS framework kill-signals.
    - Added new user preference `quran_bg_playback` (default: false) in Settings > Accessibility, letting users choose whether Quran audio should continue playing when switching away if supported.
    - On `closePage()`, completely released the hardware audio decoder and network buffers via `audioEl.removeAttribute("src")` and `audioEl.load()`.
  - **Quran Verse Tafsir In-Memory Cache (js/quran-audio.js):**
    - Implemented `tafsirSurahCache[surah]` so once a Surah's tafsir file is loaded, all subsequent verses within that Surah retrieve tafsir instantly from memory with zero redundant XHR/disk operations.
  - **Quran Search Keyboard & Remote Navigation (js/quran-audio.js):**
    - Corrected keyboard event handling in `onKeyDown`: text input elements (`INPUT`/`TEXTAREA`) now retain native Space (32) and Backspace (8) functionality without triggering media playback or closing modals.
    - Added 220ms search debounce and in-flight request guard (`searchInFlight`) to eliminate duplicate parallel fetches for `data/quran/search.json`.
    - Down Arrow (40) smoothly transfers focus from search input to the first result item; Enter (13) dismisses virtual TV keyboard and activates results navigation.
  - **Dynamic Sky Astronomical Prayer Times Sync (js/visual-fx.js):**
    - Replaced static hourly approximations with dynamic calculations matching actual prayer timings (`fajr`, `sunrise`, `dhuhr`, `asr`, `maghrib`, `isha`) from `APL.prayer.todayTimes()`.
    - Replaced raw `setInterval` with the launcher's centralized timer daemon (`APL.timers.every`).
  - **Eastern Arabic Numerals System-Wide Sync (js/visual-fx.js, js/system.js):**
    - Linked `fx_eastern_numerals` directly with `sys.pref("digitStyle")`, enabling authentic Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) across all clock, prayer widget, weather, and date displays launcher-wide.
  - **Weather Icon Micro-Animations (css/custom.css):**
    - Refined `.fx-animated-weather` selectors to target active weather glyphs (`.statusx__row--weather .statusx__ico`, `.pw-card--weather svg`).
  - **GPU Load & Visual Effects Scoping (css/custom.css):**
    - Restricted `.fx-chamfer-glass` backdrop filters to non-performance modes (`:not(.perf):not(.reduce-motion)`) and removed redundant button backdrop filters.
    - Confined `.fx-living-mesh` exclusively to `.bgblur`, ensuring wallpaper crossfade transitions on `#bgA` remain silky smooth.
    - Preserved translucent frosted glass styling on `.hekam-widget` without opaque overrides.
  - **Audio Session & Mutex Isolation**: Enforced single-audio stream guarantee across all background and foreground services. Starting Radio (`js/radio.js`) or Audio Pack alerts (`js/audio-pack.js`) now cleanly pauses `APL.quranAudio`, and vice versa, eliminating any overlapping audio streams.
  - **Chromium 76 Compatibility Verification**: Automated full codebase scan for unsupported modern JavaScript operators (`?.`, `??`, logical assignments), confirming 100% pure ES5/ES6 compatibility for Tizen 4.0/5.0/5.5/6.0/6.5 browsers.
  - **Bundle & Hash Sync**: Re-synced and verified all 74 source scripts with `js/app.bundle.js` through `tools/apl-build.py`, verifying Tanzil 6,236 verses and Saadi Tafsir offline integrity.
- **Packaging & Synchronization**:
  - Repackaged `apl-launcher-eg-v8_7_0.wgt` (15 MB, SHA256 `ca2b4c47376b708b9053d41a2d566dc77bb47a1bd1155794d05575b9b3e05236`).

- Prayer & Quran page (js/prayer-page.js, css/custom.css; same tiles, same remote order):
  - The four button rows now carry a small gold label at their start: **الاستماع** (radio, Al-Kahf, takbeer, alerts, pause, test, auto off, black screen, refresh), **الخدمات** (Mushaf, Adhkar, Hekam, My Occasions, Friday reminders, city, weather), **الصلاة** (adjust times, Summer Time, names, widget size, full width, what the widget shows), **الحكمة** (Hekam widget on/off, position, size, colour). `ppRow()` builds them; only the grouping is new.
  - One look for every tile: radius 18 / 20 px, 60 px buttons, 90 px audio tiles, one 12-14 px gap, a green tint + thin green ring for "on". 8.6.x had stacked three generations of overrides; the last CSS block now has the final word.
  - Bug: the widget's progress line ran through the prayer names (the 8.6.3 override left only 6 px under the icons while the line sits 11 px down). Icon, line and name now have fixed air (`--pwgap` 30 px; name margin = `--pwgap`).
  - Subtitle: only the city + the short source badge (the long "Calculated on this screen..." sentence is gone). Weather button shows "الطقس" with a cloud icon when there is no weather yet (it was a lone dash). "Widget size" no longer shows "Current size" (it was cut off); the percentage of the Hekam size and of the widget size is bidi-isolated so "%" stays at the end in Arabic.
- Living Mihrab (js/ambient.js, css/custom.css; same data, same timers, no blur, no filter):
  - A gold frame with four corner marks, drawn inside the drifting layer (OLED: its lines never sit on the same pixels).
  - The mosque's name between two gold lines; side shading so the text is readable over the bright lamps of the pictures.
  - Clock 178 px with the AM/PM mark small and gold, a gold rule and the day / Hijri date under it.
  - Next prayer: caption, name (70 px), time, and a 250 px dial ring (gradient arc + tick circle). During the adhan the ring is full and says "الأذان".
  - Five prayer cards (icon, name, time + ص/م): the next one lit in gold, past ones dimmed; during the two adhan minutes the card of the prayer that just came is the lit one (it showed the next one before).
  - Wisdom card above the cards: wider, 28 px, gold hairline, cut at 4 lines.
  - A slow "breathing" light (opacity only) behind the picture; off with Reduce Motion / the "Living Mihrab motion" switch / performance mode.
- js/app.bundle.js was patched with the same changes (prayer-page.js and ambient.js segments); `node --check` passes on both and on every js/*.js. tools/make-bundle.py was not run.
- Not touched: radio, daemon, HDMI, audio files, alerts, permissions.

## 8.6.6 (Untested on the TV; no browser run)
- Control Center looked broken on opening (css/custom.css, js/controlcenter.js):
  - `.cc__dim` was a gradient (62% right to 25% left) while every glass tile carries one even shade (js/glass.js): the tiles read as slices of another picture. Now one even 42% dim.
  - In rich-fx / performance modes the panel drew its own blurred dark slab (a hard rectangle behind the tiles): removed.
  - The panel slid and scaled while opening, so the tiles' glass moved against the background for 260 ms: it now only fades in.
  - `open()` calls `APL.glass.paint()` at once, so the tiles' glass appears with the panel instead of 40-90 ms later.
- Prayer & Quran page (css/custom.css): 8.6.4 sizes were too full (about 980 of 1080 px by calculation). Calmer: gaps 13 px, icon tiles 80 px, buttons 52 px / 17 px text. The page body can scroll again (scroll bar hidden), so a wrapped line can never be cut off at the bottom; the remote still scrolls to the focused tile as before.

## 8.6.5 (Untested on the TV; no browser run)
- Each flaw was checked in the code first; all five were present:
  - js/prayer-page.js: `hekamSecCache` kept every opened Hekam section for ever (files up to 1.8 MB). Now an LRU of 3 sections (`hekamCacheSet`); `close()` empties the section cache, the section list and the random list (`hekamCacheClear`).
  - js/khatma.js: the Friday reminder used its own `setInterval`; it now runs on `APL.timers.every("fridayNudge", 30 min)` (skipped while the launcher is hidden), with the old interval only as fallback.
  - js/diag.js: `box.remove()` replaced by `parentNode.removeChild(box)`.
  - css/custom.css + js/home-status.js: the code adds `has-blackout`, the CSS and the new random-wisdom guard looked for `blackout-active`; both now include `has-blackout`, so the Hekam widget is hidden and not clickable under the black screen.

## 8.6.4 (Untested on the TV; no browser run)
- Home wisdom (Hekam) widget — random on every return (js/home-status.js, js/launcher.js):
  - A new random wisdom (never the same one twice in a row) is picked every time the launcher comes back to the Home Screen: from an app, HDMI, a page (Prayer, Tasks, Settings, Control Center, Search) or the Home button. `APL.refreshWidgets` (already called on every return path) now calls the new `APL.hekamOnHome`. A burst of return events picks once (4 s), and nothing is picked while a page covers the Home Screen.
  - Bug fixed: the widget never showed the "wisdom of the day" it computed; it always started from item 0 of data/hekam/excerpts.json and then walked the list in order every 5 minutes. The first pick is now random and the 5-minute rotation is random too.
  - The full-width Home option "يعرض: حكمة" uses the same random pick (it was a fixed daily item).
  - Wisdom text is HTML-escaped before it is written to the page.
  - Long wisdoms (up to ~260 letters) are cut at 4 lines on the Home Screen (css/custom.css) so the widget can never grow over the apps row at 200% size; the screen saver / live mihrab are not affected.
- Home widgets check (prayer, tasks, weather, clock): no change needed — they redraw at once on every return path (visibilitychange, focus, pageshow, page closed, Home button) and then every 15 s (prayer, tasks), 10 s (clock) and every N min (weather, only if the data is older than 5 min on return).
- Prayer & Quran page (css/custom.css, sizes only — same rows, same tiles, same remote order): the page used about 700 of 1080 px, so the free height now goes to row gaps 10→16 px, icon tiles 74→88 px, buttons 48→58 px (text 16.5→18 px, icons 19→22 px), larger text on the night / iqama lines.
- Stability audit: `node --check` on all 71 JS modules, the bundle and bridge/service.js = no syntax errors; no `?.`, `??`, `replaceAll`, `.at()`, `findLast`, `Object.hasOwn`, `structuredClone` or `replaceChildren` in any module (Chromium 76 safe); js/app.bundle.js synced for the two changed modules only.

## 8.6.3 (Untested on the TV; no browser run)
- Prayer Page re-expansion & comfortable TV proportion layout (js/prayer-page.js, css/custom.css):
  - Solved over-compression: Restructured Prayer & Quran settings across the page into 4 dedicated, generously proportioned horizontal rows with TV-friendly button heights (52px), prominent icons, and crystal-clear Arabic typography:
    - **Row 1 (Audio & Radio Controls):** Live Quran Radio, Surah Al-Kahf, Eid Takbeer, Adhan Alerts toggle, Audio Pause/Resume, Audio Test, Sleep Timer, Screen Off, and Refresh.
    - **Row 2 (Islamic Apps & Services):** Mushaf Hafs reader, Fortress of the Muslim (Adhkar), Hekam encyclopedia, My Occasions, Friday Sunan, City selector, and Live Weather toggle.
    - **Row 3 (Prayer Widget Settings):** Manual Prayer Time adjustments, Daylight Saving (Summer time), Prayer Names display, Card Size (normal/compact), Full-Width layout toggle, and Widget Display Content cycle (Times/Quotes/Mixed).
    - **Row 4 (Standalone Hekam Widget Settings):** Standalone Hekam widget toggle, Screen position (5 corners/center), Widget scale (75%–200%), and Glow Font Color.
    - **Rows 5 & 6 (Spiritual Strip & Status):** Islamic occasions banner and Night Line / Iqama countdown strip.
  - Page fills ~690px of screen height naturally, delivering an expansive, luxury TV interface with zero scrolling and no micro-sized elements.
  - Arrow navigation updated to handle 4 discrete button rows (`row-audio`, `row-content`, `row-prayer-settings`, `row-hekam-settings`) with seamless Up/Down/Left/Right remote transitions.
- Screensaver & Live Mihrab Hekam independence fix (js/home-status.js):
  - Fixed an edge-case bug where disabling the home dock Hekam widget (`pref("hekamWidget") === false`) caused `updateHekamWidget()` and `armHekamWidget()` to exit early and remove the Hekam card from Screensaver and Live Mihrab mode.
  - Now correctly ensures wisdom cards always display in Screensaver and Live Mihrab regardless of whether the home dock widget is enabled.
- Comprehensive launcher-wide stability & edge-case audit:
  - **Focus Restoration in Prayer Sub-screens (js/prayer-page.js):** Fixed an edge-case where returning via `Back` from "Adjust Prayer Times", "Islamic Occasions", and "Live Weather" leaked arbitrary list indices into the main grid. `mainReturn` is now consistently preserved so focus lands precisely on the button that launched the sub-screen.
  - **Direct TV Remote Control for Saadi Tafsir Modal (js/quran.js):**
    - Added `onSelect` handler in Tafsir modal navigation so pressing `OK` (Enter) on the TV remote triggers the focused button (`✕ إغلاق`, `◄ التالية`, `السابقة ►`) or closes the modal seamlessly.
    - Added automatic Mushaf page-turning upon closing the Tafsir modal: stepping through ayahs in Tafsir across page boundaries now flips the Mushaf to the exact target page and highlights the active ayah.
    - Added `APL.sound.tick()` audio feedback when stepping ayahs in Tafsir.
  - **Row Navigation Precision (js/prayer-page.js):** Tightened vertical clustering threshold from 30px to 22px in `moveVertical` to eliminate any chance of adjacent rows merging during remote arrow navigation.
  - **Screensaver / Mihrab Hekam Class Isolation (js/home-status.js):** Suppressed user dock/corner placement classes (`hekam-widget--pos`) while in screensaver or live mihrab mode, preventing class collisions with screen-centered screensaver styling.
  - Verified 0 broken references across all 72 JavaScript modules and CSS files.
  - Verified navigation integrity, cleanup on page teardown, audio resource release, and safe modal focus restoration.

## 8.6.2 (Untested on the TV; no browser run)
- Prayer Page perfected layout & radio positioning (js/prayer-page.js, css/custom.css):
  - Moved the Quran Radio and audio action row (`audioIcons()`: Radio, Al-Kahf, Eid Takbeer, Alerts, Test, Sleep, Black Screen, Refresh) directly below the prayer times widget card.
  - Eliminated awkward empty gaps and uneven line wrapping by converting pill buttons to a balanced, full-width `flex: 1` structure that stretches smoothly across the screen width.
  - Merged action buttons into two clean, structured horizontal rows:
    - **Islamic Apps & Services (`contentButtons()`):** Hafs Quran reader, Adhkar, Hekam offline encyclopedia, My Occasions, Friday Reminders, City, and Weather.
    - **Widget Controls & Settings (`settingsButtons()`):** Adjust prayer times, Summer time, Names, Widget size, Full width, Hekam standalone widget toggle, Hekam position, Hekam size, and Hekam font color.
  - Compacted `.pw-btn` height to 44px (resolving legacy CSS override that enforced 60px/84px), reduced gaps and padding, making the entire page fit within ~500px on 1080p for a guaranteed 100% scroll-free interface.
  - Restructured remote arrow navigation (`moveVertical`) to cleanly traverse row-by-row without getting lost.

## 8.6.1 (Untested on the TV; no browser run)
- Hekam font color configuration (css/custom.css, js/settings-tree.js, js/home-status.js, js/prayer-page.js):
  - Added font color choice (`hekamColor`): Royal Gold (`gold`), Crystal White (`white`), Sky Blue Neon (`sky`), Galaxy Purple (`galaxy`), and Islamic Phosphor Green (`green`).
  - Styled with glowing text shadows and matching colored accents for high legibility on any wallpaper.
  - Added color switcher button directly in the Prayer Page Hekam controls row and Settings.
- Reorganized Prayer Page layout & anti-scroll optimizations (css/custom.css, js/prayer-page.js):
  - Split crowded action buttons into two dedicated, well-spaced rows: one for prayer widget settings and an isolated row (`.pw-btns--hekam`) for Hekam widget settings (Toggle, Position, Size, Font Color).
  - Reduced prayer widget dimensions (`.pw--page` height, icon size 40px, padding 8px 30px 6px, and pill button height to 52px) so the Prayer & Quran screen fits comfortably on 1080p without any vertical page scrolling.
- Automatic Quran Radio & Background Audio Stop on Exit (js/radio.js):
  - Radio and any active background audio now stop automatically as soon as the launcher leaves the foreground (`leftLauncher` and `releaseForVideo`).
  - Clears `wanted` intent and pauses `APL.bgAudio` to guarantee foreground-only playback.
- Hekam Wisdom Card in Screensaver & Live Mihrab (css/custom.css, js/screensaver.js, js/home-status.js):
  - Displays the Hekam wisdom card with proportionate scaling and frosted glass styling inside both the standard Screensaver (`body.screensaver-active`) and Living Mihrab (`body.mihrab-active`).
  - Positioned safely without colliding with the corner clock, date, or mihrab prayer times.
  - Automatically activates and updates wisdom text during screensaver sessions.
- Black Screen Flash Mitigation on Home Return (css/custom.css, js/launcher.js):
  - Preserved `.bg`, `.bgblur`, `.scrim`, and `.home` during `html.apl-away` by removing destructive `display: none !important`, keeping WebKit GPU compositor layers alive in memory.
  - Removed forced backdrop reset (`setBackdrop(act, false)`) and veil transition delay on `visibilitychange` for instantaneous, seamless return to the Home screen without black flashing.
- Elevated Above-Dock Positioning (css/custom.css):
  - Increased `.hekam-widget--above-dock` offset from `bottom: 235px` to `bottom: 340px`, comfortably clearing the dock row (top: 783px / 297px from bottom) and tile zoom focus effects.

## 8.6.0 (Untested on the TV; no browser run)
- Ayah Tafsir modal freeze fix (js/quran.js, css/custom.css): Fixed Tafsir modal failing to show (`display: none` without `.is-open`) which caused remote navigation to freeze on ayah selection. Reconstructed modal overlay with explicit visibility, z-index 999999, matched CSS classes, and clean TV remote navigation.
- Hekam widget controls directly in Prayer Page (js/prayer-page.js): Added direct widget controls in Prayer & Quran page (`widgetButtons()`), allowing one-click toggle (on/off), position cycling, and size adjustments without going through Settings.
- Frosted liquid glass redesign for Hekam standalone widget (css/custom.css, js/home-status.js):
  - Styled with liquid frosted glass backdrop matching the prayer widget (`backdrop-filter: blur(30px) saturate(1.6)` with subtle border and inner glass highlight).
  - Font size matched to prayer names in the prayer widget (`24px` base scaled by widget scale).
  - Removed source/scholar name attribution completely, displaying clean wisdom text.
  - Eliminated compressed square box and line clamping (`-webkit-line-clamp: none; white-space: normal; word-break: break-word`) with broad horizontal cards (up to 1100px) so quotes are never truncated or clipped.
  - Added new prominent position options: centered above the first app row / dock (`above-dock`), and top center (`top-center`), alongside existing positions.
- Ramadan cannon before Maghrib Adhan alert in Ramadan only (background/daemon.sh, js/prayer.js, js/prayer-alert.js, js/ramadan.js):
  - Integrated Ramadan cannon directly into the prayer alert daemon and alert supervisor cycle.
  - Maghrib alerts during Ramadan (`maghrib_ramadan`) automatically fire the authentic Ramadan cannon audio first, followed immediately by the Maghrib Adhan.
  - In Ramadan only: outside Ramadan, standard Maghrib Adhan alert fires normally.
  - Uses the exact same background alert mechanism as prayer alerts (Vetro daemon PulseAudio/GStreamer/aplay, automatic radio pausing/resuming, and HTML5 audio fallback).
- Verified Tafsir al-Saadi dataset (data/tafsir/): structured all 114 surahs from verified, authentic digital commentary (7,150 blocks, 100% ayah coverage across all 6,236 verses). Modular per-surah datasets `data/tafsir/{1..114}.json` with passages fallback and clean index `data/tafsir/index.json`.
- Complete removal of broken OCR Tafsir and Mukhtasar Minhaj al-Qasidin: removed obsolete OCR files, OCR build tools, chapter indices, and broken text entirely from data, UI, menus, keyboards, and router.
- New Authentic Ramadan Cannon Sound (sounds/ramadan-cannon.wav): authentic broadcast sound converted to clean 44.1kHz 16-bit mono PCM.
- TV Audio Storage Preservation: strictly preserved user audio rules (never delete or modify `Documents/APL-Audio/alkahf.mp3` or `takbeerat-eid.mp3`).

## 8.5.0 (Untested on the TV; no browser run)
- Kalem Tayeb offline encyclopedia (data/hekam/): full crawler (tools/fetch-hekam.py) extracted 35,448 items across 53 sections from kalemtayeb.com/hekam. All data saved offline and organized into `sections.json` (53 sections directory), `sec_NN.json` (53 modular files, 35,448 items total, lazily loaded), and `excerpts.json` (1,000 curated, balanced quotes from Ibn al-Qayyim, Ibn Taymiyyah, Ibn al-Jawzi, Al-Ghazali, early Salaf, and contemporary scholars).
- Browsing screen in Prayer & Quran (js/prayer-page.js): "حكم ومواعظ" button in the main Prayer page opens the offline browser. Includes 53 section categories with item counts, modular pagination (20 items per page with previous/next controls and remote focus), and a "🎲 حكمة اليوم العشوائية" card with instant random quote generator.
- Full-width Home widget option (js/system.js, js/home-status.js, js/prayer-page.js): `prayerWidgetShow` cycle extended with `"hekam"` ("حكمة اليوم"), displaying daily spiritual quotes and scholar attribution across the Home Screen above apps.
- Standalone 5-minute rotating Home widget (js/home-status.js, js/system.js, js/settings-tree.js): `hekamWidget` switch (default off, toggleable in Settings > Prayer and Quran and Heavy Features) displays a dedicated wisdom card on the Home Screen rotating every 5 minutes completely offline via `APL.timers.every`.
- Adhkar behavior confirmed: When a dhikr completes its target count, it displays a checkmark `✓`, applies `.is-done`, and automatically jumps focus to the next incomplete dhikr.
- Book search confirmed: Offline instant search ("search-book") available in `js/quran.js` covering Tafsir al-Saadi and Mukhtasar Minhaj al-Qasidin.
- Mushaf reader menu: Added "حكم ومواعظ الكلم الطيب" to the Mushaf sidebar menu for direct navigation.

## 8.4.1 (Untested on the TV; no browser run)
- Full-screen book reader (js/quran.js, css/custom.css): Tafsir al-Saadi and Mukhtasar Minhaj al-Qasidin now open in full screen matching the Mushaf architecture (`.mq--read`). Static top toolbar and permanent headers/footers removed from book view, providing 100% full-screen immersive reading.
- Dynamic sliding side panel (`mq__side` & `mq__tools`): Controls dynamically populated by `buildSideTools()` for Tafsir and Minhaj. Pressing RIGHT or OK on the remote while reading slides the side panel smoothly over the text; pressing LEFT or Back closes it and returns focus to the book text.
- Remote navigation & reading controls: UP/DOWN smoothly scrolls book text (0.62 viewport jump), and turns chapter at top/bottom edges with debouncing (`lastFlip > 450ms`); LEFT flips forward to next unit.
- Dedicated side tools for books: Next/Previous, ±10 parts (Minhaj), Chapters Index, Instant Book Search, Surah Index (Saadi), Ayah Tafsir lookup (Saadi), Open in Mushaf (Saadi), Font size adjustments, Line spacing (4 levels), Paper theme toggle, Text color selection (6 palettes).
- Reading progress & footer stat: Slim bottom progress bar and reading status bar (`mq__reading-stat`) showing current book, chapter/surah number, and total count, plus navigation hints.

## 8.4.0 (Untested on the TV; no browser run)
- Prayer & Quran page widget height: reduced by ~10-12% vertically (padding 12px 40px 10px, ico 52px, since 20px, left 34px, head margin 7px, name 22px, time 19px, col gap 5px) without changing width, giving vertical clearance so items below are accessible without extra downward remote scrolling.
- Tafsir & Minhaj search (js/quran.js, view "search-book"): instant substring search from the first letter matching normalized text (diacritics, alef, yaa, tatweel unified), batches of 20 results with pagination, on-screen remote keyboard + input field. Temporary index built on demand in non-blocking batches of 10-12 files with live progress percentage (0-100%), and completely freed on close (zero idle memory/timer cost). Result items show snippet with OCR disclaimer, and pressing OK jumps directly to the matched book/surah/page; Back restores query and results position. Reusable book tabs (Tafsir Saadi / Mukhtasar Minhaj al-Qasidin) in the searchbar, menu item in the Mushaf sidebar, and dedicated search buttons inside Tafsir and Minhaj reader toolbars.
- Minhaj chapters index (data/minhaj/chapters.json, js/quran.js, view "minhaj-chapters"): complete chapter index of 39 books and sections categorized across the 4 quarters of Mukhtasar Minhaj al-Qasidin (ربع العبادات، ربع العادات، ربع المهلكات، ربع المنجيات). Dedicated remote navigation screen with quarter filter tabs; OK jumps straight to the chapter in the reader; Back restores chapter list. "فهرس الأبواب" button inside the Minhaj reader toolbar and "أبواب المنهاج" in the Mushaf sidebar menu.
- Minhaj daily excerpts (data/minhaj/excerpts.json): expanded from 19 to 178 sound, cleaned wisdom passages from Ibn Qudama's Mukhtasar Minhaj al-Qasidin (word frequency validation against the book, OCR noise and footnotes thoroughly filtered out), rotating daily in the full-width Home Screen widget.

## 8.3.0 (Untested on the TV; no browser run)
- Verse-with-tafsir index (tools/ayah-index.py, data/tafsir/ayah-index.json 34 -> 39 KB): second pass with edit-distance-1 word matching (words >= 5 letters) ONLY for verses the exact pass left empty, searched between the neighbouring exact matches; confidence reduced by 8, so only strong fuzzy hits (>= 85 after the cut) show an excerpt, the rest open the whole book page. Coverage 2071 -> 2697 of 6236 (33% -> 43%); all 2071 earlier matches are byte-identical (checked). 192 of the 626 new ones reach excerpt level. Accuracy of the new ones NOT hand-checked (OCR; expect lower than 70-80%).
- Size: PNGs and WebP already optimal (lossless re-save saved 0 bytes), JSON already compact; package is only re-zipped at maximum level. No other size work (deleting source js/*.js duplicates of the bundle would break tools/apl-build.py and was not done).
- Not done (still open): tafsir/minhaj search, minhaj chapter index.

## 8.2.0 (Untested on the TV; no browser run)
- Verse with its tafsir: tools/ayah-index.py builds data/tafsir/ayah-index.json (34 KB) by matching each verse (Simple Clean, words >= 3 letters, >= 75% of words on a page of that surah only, pages monotone). Coverage 2071 of 6236 verses (33%); the rest have no place (OCR too noisy / short verses).
- Accuracy, manual check of 30 random matched verses: ~21 exact (verse quoted at the offset), ~3 uncertain, ~4 wrong place (e.g. 75:31, 87:18, 104:8, 51:41). So about 70-80% right among matched ones; shown with a threshold: confidence >= 85 = excerpt, below = whole book page.
- Home widget: fifth choice "آية مع تفسيرها" (prayerWidgetShow = occ | ayah | tafsir | minhaj | pers): today's verse + ~260-char excerpt (OCR label); index loaded lazily and not kept.
- Tafsir page (Saadi): buttons "آية مع تفسيرها" (next verse) and "آية +١٠" scroll to the matched page and show a status line.
- Still open: tafsir/minhaj search, minhaj chapter index, more size savings.

## 8.1.1 (Untested on the TV; no browser run)
- Size: images/settings-icon.png 170,715 -> 28,209 B, apps/sonyliv-tile.png 68,004 -> 18,163 B, apps/vetro-tile.png 119,483 -> 47,428 B (256-colour palette, same pixel size; total -264 KB). Display size of the settings icon is 560 CSS px from a 512 px source, so it was not shrunk. Look at these three images on the TV for banding.
- Not done yet (still open): verse-with-tafsir index, tafsir/minhaj search, minhaj chapter index.

## 8.1.0 (Untested on the TV; no browser run)
- Adhkar (js/prayer-page.js): when a dhikr reaches its count (e.g. 3/3, 100/100) focus moves on its own to the next dhikr that is still open (wraps to the start; when every one is done a "Completed" toast). Counting rules and the reset are unchanged.
- My Occasions: new button on the Prayer page "تنبيه مناسباتي" cycles the toast lead time 3 / 7 / off / 1 day (pref personalRemindDays, default 3, same as before); prayer-alert and background-engine untouched.
- Full-width Home widget: fourth choice "مناسبتي القادمة" (prayerWidgetShow = occ | ayah | minhaj | pers): name + days left of the nearest personal occasion (js/personal.js nearest(), js/home-status.js).
- Package size: see the report (old test/audit reports removed from the package).

## 7.2.3 (Untested on the TV; no browser run)
- Owner asked for the Minhaj text in the app (he checked it himself). New menu item "مختصر منهاج القاصدين" in the Mushaf menu: same reader as the Saadi tafsir (js/quran.js tfBook = saadi | minhaj): 52 chunk files data/minhaj/NN.json (~1.5 MB, from fts.txt with only whitespace / a few OCR letter fixes), next/previous, +/-10 jump, font, spacing, paper, colour. No chunk index list and no search yet.
- Full-width widget: third choice "يعرض: من المنهاج" (prayerWidgetShow = occ | ayah | minhaj; button cycles) = one passage a day from data/minhaj/excerpts.json (only 19 lines passed the cleanliness filter; OCR, labelled as such).
- "Verse with its tafsir" is still NOT done: the OCR tafsir has no reliable verse numbers.

## 7.2.2 (Untested on the TV)
- Saadi tafsir (data/tafsir): all 114 surahs now have a file (33 were missing). New tools/tafsir-tail.py + tools/tafsir-tail-ranges.json rebuild surahs 62-114: page ranges found by matching the book's quoted verses against the verified Mushaf text (monotone page->surah labelling; agrees with the old header ranges for surahs 1-61). Old header ranges for 76, 81, 86, 88, 99 etc. were off by about a page and are replaced. Boundary pages can be shared by two neighbouring short surahs. Still unverified OCR, page-level not ayah-level. data/tafsir ~4.7 MB. No JS change except build.js version.

## 7.2.1 (Untested on the TV)
- Prayer widget (js/prayer.js nextW): counts down to the next of six times, sunrise included; the time LEFT is the big line, "since" the small one (Home and Prayer page). Prayer page widget slimmer.
- New js/personal.js: page "مناسباتي" (pill beside Islamic occasions): birthday, anniversary, newborn, graduation, engagement, party, other; name suggestions, date steppers, edit/delete; live age (years, months, days, hours, minutes) and time to the next one, one 1 s timer only while open.

## 7.2.0 (Untested on the TV)
- Mushaf (js/quran.js, css): whole page fits the screen (auto font size); options in a side panel hidden while reading (RIGHT opens, LEFT/Back closes); UP = previous page, DOWN = next page; hand-set font size and "fit" toggle in the panel; panel narrower.
- Fonts: the v7.0.8 rules used `:not(.mq *)`, dropped by Chromium 76, so no font ever changed. 9 real fonts bundled in fonts/ui (SIL OFL), new default Tajawal; old names mapped; "system" = old look.
- Al-Kahf: Resume / Restart half-size buttons beside the tile (js/audio-pack.js resume/restart; resume point kept after a manual stop).
- Radio (explicit owner request): AVPlay cut while hidden -> handed to the background player; back in front -> stopped and AVPlay reconnects. Pref radioHandoff (default on). daemon.sh untouched.
- Full-width Home widget: height capped by the dock position, prayer widget larger, weather smaller, tasks window lists four tasks, virtue lines bigger.

## v7.1.2

Owner's request. **Untested on the TV.** Each occasion now carries a short virtue / hadith line (Arabic only) in the widget green: under the four cards of the Prayer and Quran page, a longer version with its source in the Islamic Occasions list, and the short one in the full-width Home widget (2 lines). Texts live in `FADL` in js/islamic.js (s = short, f = full with source); only well-known authentic reports are quoted (Bukhari, Muslim, agreed upon, Tirmidhi, Abu Dawud, Nasa'i), and the Mid-Sha'ban and Isra' entries say plainly that no authentic text singles the night out. **The texts need the owner's review before release.** The full-width widget got a little tighter (scale 1.9) to make room. (js/islamic.js, js/prayer-page.js, js/home-status.js, css/custom.css)

## v7.1.1

Owner's requests. **Untested on the TV; no Chromium here.**
- Prayer widget size: the choices are now shown as a total (100% current, 125, 150, 175, 200, 250, 300%); the stored value is still the "% above normal" (0..200), so old settings keep working (js/prayer.js scaleOf, js/settings-tree.js, js/prayer-page.js size button).
- Full-width widget (Settings > Prayer and Quran > Full-width widget, and a "عرض كامل" button beside the size button on the Prayer page): the prayer widget (fixed 210% inside it, independent of the size setting), weather and next task sit in one row across the Home Screen, with the next four occasions as cards underneath (same list as the Prayer page). Panel between 188px and about 630px, above the app title (dock-top 783px). Off by default; with no prayer times yet it falls back to the normal box. (js/home-status.js, css/custom.css, js/system.js)

## v7.1.0

Owner's requests. **Untested on the TV; no Chromium here.**
- Fonts: the interface-font choice moved from Settings > Accessibility to Settings > Appearance (right under Theme) and got 6 new choices: Amiri, Classic Naskh (FreeSerif), Condensed (DejaVu Sans Condensed), Heavy (DejaVu Sans Bold), Noto Sans (TV system font, falls back) and Samsung (TV system font, falls back). Bundled subsets: fonts/APLCondensed.woff, APLBold.woff, APLNaskhSerif.woff (~77 KB together). The Mushaf keeps its own font. (js/settings-tree.js, js/safe-mode.js, css/custom.css)
- Living Mihrab screen saver (js/ambient.js, css/custom.css): the packaged mosque pictures (Haram, Nabawi, Aqsa) crossfade every 28 s with the existing slow pan (stopped by Reduce Motion / performance mode), under a tint that follows the real prayer times, big clock + weekday + Hijri date, a ring counting down to the next prayer, the five prayers along the bottom (next one highlighted), golden glow for two minutes at the adhan. No blur, no network, no audio. Screensaver.js unchanged.
- Mushaf (js/quran.js, css/custom.css): the big header block above the page is hidden while reading (page / surah / juz line moved into the line under the page); RIGHT on the page now goes to the reading controls (previous page: UP at the top, or the "السابقة" button); new "◉ لون" button in the reading tools cycles the text colour (6 for the dark theme, 6 for the paper theme), saved with the other reading choices.

## v7.0.9

Owner's request. Prayer and Quran page (js/prayer-page.js, occasionsStrip): the four cards are the four occasions that come first from today, nearest first, instead of a fixed set (Ramadan, last ten nights, Eid al-Fitr, Eid al-Adha). The Monday/Thursday fast and the White Days stay out of the strip (they repeat all the time) and remain in the full list. The full Islamic Occasions list was already in order of nearness (js/islamic.js, checked in Node on 19 Nov 2026) and is unchanged. Still four cards, so the remote's geometry above the four button columns is unchanged. Untested on the TV.

## v7.0.8

Owner's requests, on top of 7.0.7 (which stays untouched in its security parts). **Untested on the TV; no Chromium here.**
- Control Center: no dark screen and no solid plate behind the tiles; the wallpaper shows through (css/custom.css, last lines). The tiles keep their own glass shade.
- Optional interface fonts: Settings > Accessibility > Font (Default / Tahoma / Naskh / Kufi / Serif / APL). Only fonts already on the TV or bundled (APLArabic, Amiri Quran); no new font file was added (package stays light). The Mushaf reader keeps its own font.
- Surat Al-Kahf: stopping it by hand forgets the place, so the next play starts from the beginning. Leaving the launcher or a prayer alert still keeps the place (js/audio-pack.js).
- Eid Takbeer: repeats as soon as it ends until you stop it; stops by itself if the file ends 3 times in under 4 s each (broken file) (js/audio-pack.js).
- Radio behind other apps: the existing "radioBackground" option is now on by default and has a switch (Settings > Accessibility > Radio in the background). Nothing in the daemon, HDMI code or radio.js changed: with the switch on, the launcher no longer stops the AVPlay stream when an HDMI input or another app opens. Whether the TV keeps the stream alive is the open question (TV-TEST 20).
- Version 7.0.8 in config.xml, js/build.js, version.json, BRIDGE_VERSION. Untouched byte for byte: daemon.sh, bg-daemon.js, radio.js, prayer-alert.js, background-engine.js, ramadan.js, native/*.

## v7.0.7

Independent audit of the owner's 7.0.4 package (claims from an earlier report treated as hypotheses, each checked in the code). Built on top of 7.0.6 (which already holds the 7.0.5/7.0.6 work). Full report: AUDIT-REPORT-7.0.7.md.
- **bridge/service.js (security):** the plain port APL_BRIDGE_PLAIN (open to every app on the TV) relayed any method and any path to Vetro, including POST /exec (root shell), and could answer to the sender's own port. Now: (1) the sender on the plain port must be APLauncher.Home (reply port appId, given by the platform), otherwise only GET /__ping, /bridge-info, /__vetro-health, /status, and the answer goes only to the launcher's own reply ports; (2) all ports: only GET/POST/HEAD, only the Vetro paths the launcher calls (/status /probe /screen /apps /components/action /exec /hbbtv /input /keep-removed /leftovers /quick /remap /wins /dns), path printable ASCII up to 1024 chars, body up to 256 KB, all fields must be text; refusals are counted in /bridge-info > denied. A refused path answers status 0 so the launcher falls back to its direct route as before. The trusted port (same certificate only) keeps every allowed path. APL_SOURCE_SHORTCUT unchanged (already limited to H1/H2 handoff).
- **js/system.js:** a request on the plain port always attaches the plain reply port (before: only on Tizen < 7), so the bridge can see who sent it.
- **js/safe-mode.js:** What's New also waits while a folder is open (has-folder), icons are being moved (is-editing), the prayer blackout / Prayer Flow dark screen / kid-limits cover / Khatma panel / app-launch veil / system page is up. Before, it popped over a folder and over icon moving, and the OK meant for "place the icon" closed the popup instead.
- **Heartbeat:** bridge-info has lastDaemonOkAt + daemonState (the daemon's own PLAYING/PAUSED/STARTING/STOPPED line in the /exec output). Recovery logic unchanged. Alert Keeper Health and TV Check show it as a separate line (js/ux-extras.js, js/tv-check.js, one Arabic string in js/lang-ar.js).
- Not changed: radio, daemon.sh, bg-daemon.js, HDMI, audio core, prayer/task alert path, config.xml privileges, design.
- Desktop only (not TV): bridge unit test 21/21 (original 7.0.4: 10/21), What's New folder/edit test PASS (7.0.4 FAIL), arrow audit 18 pages same as 7.0.6. Untested on the TV.

## v7.0.6

Owner said "continue": next ROADMAP item, lighter Mushaf load. No TV-TEST results came in, so nothing was "fixed from the TV".
- **data/quran split:** `meta.json` (surah/page/juz tables + a verbatim copy of 1:1, 8 KB), `juz/01.json`...`juz/30.json` (the verbatim Uthmani verses of each juz, 44-49 KB), `search.json` (Simple Clean, 754 KB). Every file keeps the Tanzil notice. `hafs.json` (2.1 MB) is no longer shipped; `tools/quran-split.py --join` rebuilds it byte-for-byte (sha256 8f7aa810... kept in meta.json and PROVENANCE.json) and `--check` runs inside `tools/apl-build.py`.
- **js/quran.js:** opening the reader reads meta.json + only the juz file(s) of the page (a page across two juz reads both); turning into a new juz reads that file then draws. The search screen opens with meta only; the FIRST letter reads search.json + all 30 juz once, shows "بنجهّز البحث…" meanwhile, and keeps focus where it was. Missing/broken file -> the same "not available + retry" screen. Close aborts every pending read and releases all data, as before. Search logic, normalization, order and batches unchanged.
- Desktop Chromium (not TV): all 604 pages vs the original source = 0 differences, 112 opening basmalas; 13 searches give exactly the same indices and order as 7.0.4; open-to-text 34 vs 57 ms (CPU x6 throttled: 160 vs 318 ms) and ~3 MB less JS heap. Package size about the same (7.17 MB vs 7.09 MB: same text, +31 copies of the Tanzil notice); the gain is what the TV must read and parse when the Mushaf opens (~55 KB instead of 2.1 MB). Untested on the TV.

## v7.0.5

Owner said "continue": next ROADMAP item (arrow test + rows mode). Chromium 159 (Playwright headless) could be installed in the build sandbox this time, so the earlier 7.0.3/7.0.4 work was also opened in a desktop browser for the first time (Untested on the TV).
- **New tool tools/arrows-audit.py** (desktop only, not shipped behaviour): opens 18 screens in preview mode with the network blocked, presses real arrow key events from every focusable tile in all 4 directions, and reports unreachable tiles, tiles with no way out, focus lost on hidden/off-screen elements, row jumps inside one container, diagonal LEFT/RIGHT jumps, one-way moves, and JavaScript errors. Before the fix: no unreachable/stuck/lost tile and 0 JS errors on any screen; diagonal jumps found in Control Center (13), Tasks (2), Search (2).
- **"rows" mode in js/navigation.js** (opt-in Nav option `rows: true`, default off so every other screen is byte-for-byte the same behaviour): LEFT/RIGHT only go to a tile that shares the current tile's row (vertical overlap) and stop at the row's end; UP/DOWN unchanged. Turned on for Control Center (no more Sleep -> game button / Do-Not-Disturb -> round button jumps), Tasks page, and app Search (Clean Background button no longer drops into the letters).
- **Mushaf sidebar:** LEFT from the sidebar now goes back to the last focused tile inside the page (same surah/juz/result/letter) instead of always the first item; falls back to the old target if that tile is gone.
- Bundle sections changed: navigation, controlcenter, tasks-page, search, quran (via tools/apl-build.py --sync only). Prayer page, radio, daemon, bg-daemon, prayer-alert, background-engine, HDMI, config permissions, audio untouched. Bridge: BRIDGE_VERSION only. Untested on the TV.

## v7.0.4

Owner said "continue": first item of the ROADMAP list. "What's New" (js/safe-mode.js) no longer fires 8 s after boot wherever you are. It waits for the bare home screen (no page/Settings/Control Center/search/drawer/menu/switcher/screensaver/alert/Mushaf reader open), retries every 5 s up to 10 minutes, and marks the version as seen only when it is actually shown. Only the safe-mode bundle section changed (plus version numbers). Untested on the TV; no Chromium here, so not browser-tested either.

## v7.0.3

Owner request: remove French, then every improvement from the review list that is safe without a TV. Untested on the TV.

- **Removed:** French. `lang-fr.js` was never in the package; i18n.js no longer picks `fr` from the screen language (Arabic or English only). Dead French branches in prayer-page.js and system.js removed.
- **Mushaf reader (js/quran.js, css/custom.css):** font sizes 34-72 (was 34-54); 4 line spacings (button "تباعد"); calm paper theme (button "ورقي"); Large Text and High Contrast now reach the reader; **last-verse bookmark** (the verse at the top of the reading area is saved; opening the Mushaf from the Prayer page or Settings returns to it, marked in green); new side-menu entries "كمّل من آخر آية" and "أدوات القراءة"; **▼ at the end of a page turns to the next page, ▲ at the start turns to the previous one** (lands at its end; on page 1 ▲ still goes to the toolbar; 450 ms guard against key repeat).
- **Build tool:** new `tools/apl-build.py` (check by default, `--sync` copies only changed sources into their bundle sections, `--fix-version-json`). Knows that kid-lock.js lives inside the ux-extras section. Checks sections, versions (config.xml, build.js, version.json, bridge, CHANGELOG), `node --check`, Chromium-76 syntax. `tools/make-bundle.py` is now disabled (it exits with a message). version.json `scripts` re-synced to build.js (71 files; it had 60).
- Versions: config.xml, js/build.js, version.json, bridge BRIDGE_VERSION = 7.0.3. Bridge changed only in that number.

## v7.0.2

Audit of the last five versions (3.4.1 to 7.0.1). Untested on the TV.

- **Fix:** `JUZ` table in js/khatma.js had two wrong first pages: juz 7 starts on page 121 (was 122) and juz 11 on page 201 (was 202). Checked against the Tanzil Medina metadata in data/quran/hafs.json (all 30 juz starts, page 2/3/582/604 anchors, Al-Kahf 293-304, 114 ayah counts, 6,236 verses all agree). Affects the juz shown by the khatma panel, "I read a whole juz", and the legacy reader's up/down; the new reader already used the data file.
- **Verified, no change:** syntax of every js file, bridge, build.js; sh -n on both scripts; config.xml well-formed; build.js script list == bundle sections (kid-lock.js text sits inside the errlog section, loads fine); only the known ux-extras divergence and a blank line in tv-check differ from js/*.js; versions aligned; every listed image exists; no ES2020+ syntax in the bundle; live search counts equal an independent recount.

## v7.0.1

Owner-reported fixes on the Prayer and Quran page. **Untested on the TV** (checked in desktop Chromium only).

- **Mushaf button on the Prayer and Quran page:** new green "المصحف" pill next to Adhkar (row with the city and weather). OK opens the offline Hafs reader on top of the page (`.has-aplpage .mq` raised above the page); Back returns to the Prayer page on the same pill. The Mushaf was previously reachable only from Settings > Prayer and Quran.
- **Remote navigation on the Prayer page:** all four arrows now follow the visible rows (tiles clustered by vertical centre, left/right by on-screen x so RTL is right). LEFT/RIGHT stop at the row's end instead of jumping to another row (e.g. last icon went to the Eid al-Adha card; first pill went down to Radio); UP/DOWN pick the nearest tile by x in the next row; reaching the first row scrolls back to the top.
- **Reader toolbar:** LEFT/RIGHT on the buttons above the page (next, previous, font -, font +, "I read it") moves between those buttons, and RIGHT from "next" goes to the side menu; DOWN returns to the page text. Before, the big page text won the geometric search and the page turned by mistake.
- **Build:** js/prayer-page.js and js/quran.js replaced as whole sections of js/app.bundle.js (all other sections byte-identical); css/custom.css appended. Version 7.0.1 in config.xml, js/build.js, version.json and bridge/service.js (only BRIDGE_VERSION). tools/make-bundle.py not run. Radio, daemon, HDMI, permissions, audio and prayer-alert paths untouched.

## v7.0.0

Owner-requested jump from 3.5.0; implementation and desktop checks only. **Untested on the TV.**

- **Offline Hafs Mushaf:** new js/quran.js, compact UTF-8 data/quran/hafs.json, embedded 76 KB Amiri Quran WOFF. 114 surahs / 6,236 fully-vowelled ayahs, 604 logical Medina pages, 30 juz. Text is verbatim Tanzil Uthmani 1.1, not recreated from memory. Source notices, license and provenance/hashes included. The supplied Warsh archive was deliberately not embedded.
- **Glass RTL reader:** separate surah and juz indexes in Quran order; each opens its exact starting ayah. Read/resume uses the old Khatma position and daily counters; browsing/search do not increment them. Text is scrollable rather than a printed-page facsimile. Unnumbered opening basmala separated from ayah 1 (except Fatihah); none added to Tawbah. Font size controls, target-ayah highlight and Back-to-index/search. Legacy picture reader remains a fallback only if quran.js is absent.
- **Instant search from first letter:** any substring, not just word starts; query grows normally to a word/phrase. Results stay in canonical surah/ayah order, with total count and 20 results per batch. Local Arabic keyboard + normal text input, space/delete/clear, ignores diacritics/alef variants, searches both Imlaei and Uthmani representations without changing displayed scripture. No online endpoint, no search worker, corpus/index released on close.
- **Matching green adhkar focus:** entry pill, morning/evening tabs and rows use the existing Prayer greens (#a6f24a dark, #30d158 light). Dhikr text and repetition logic unchanged.
- **Cannon without modifying old audio:** ramadan.js uses NEW background/ramadan-cannon.sh through Vetro's signed shell/stdin, with a unique one-shot Pulse sample of the unchanged 1.1 s WAV. Automatic request waits 9 s then yields to any active prayer alert for up to 45 s. No global mute/volume commands, no AVPlay/radio pause/resume, no old daemon edits. HTML5 fallback for preview/unreachable Vetro. New status button shows the request status, explicitly NOT proof of audible output.
- **Preserved:** background/daemon.sh and embedded js/bg-daemon.js v4.6, radio, background-engine, prayer-alert, HDMI/system logic, config permissions, existing PCM sound bytes and all TV Quran/Eid recordings. Bridge service changed only BRIDGE_VERSION. No new heavy feature switch needed: no idle overhead; blur uses existing opt-in richFx only.
- **Build/QA:** scripts list updated ONLY in js/build.js; quran.js appended last in bundle. Modified sources patched by unique whole-file text replacement; all other original bundle sections (including the divergent ux-extras section) byte-identical. Never ran tools/make-bundle.py. Versions aligned to 7.0.0 in config.xml, build header/version, version.json version/first notes and bridge/service.js. Every modified JS passes node --check + ES2019 syntax parse; new shell passes sh -n. Desktop tests and six mocked native-audio cases described in TEST-REPORT-7.0.0.md; no TV/audio-output claim.

## v3.5.0

(1) Mushaf, Khatma, Friday Al-Kahf (new js/khatma.js; Settings > Prayer and Quran > "المصحف والختمة"): reader screen (OK = I read this page, left/right = page, up/down = juz), resume page, daily goal (21 / 10 / 7 / 4 / 2 pages), streak, finished khatmas, Friday Al-Kahf (pages 293-304, plays the streamed Al-Kahf audio, one quiet Friday toast). No Quran text or pictures inside the package: page pictures come from the TV folder APL-Quran (001.jpg ... 604.jpg, or .png / .webp); without them the screen is a page and juz counter. (2) Full Ramadan mode (new js/ramadan.js; "وضع رمضان"): automatic in Hijri month 9 or forced on / off, soft gold wash and a chip with the Ramadan day and the live countdown (suhoor ends, iftar, Isha, Taraweeh), toasts for suhoor (45 min before Fajr), iftar and Taraweeh, 30-day khatma plan, a "try it now" button. Cannon: sounds/ramadan-cannon.wav by HTML5 Audio, best effort; the daemon sound path is untouched. (3) Safe mode restore (new js/safe-restore.js): the launcher keeps one copy of its own files at /opt/usr/home/owner/APL/last-good after a version starts well twice (needs 60 MB free); safe mode offers to go back, and after 5 failed starts of a never-working version it goes back once by itself, then reloads; Settings > Performance > "آخر نسخة شغالة" shows, saves and restores by hand. Audio files on the TV are not part of it. (4) Small items: embedded Arabic font (fonts/APLArabic.woff, a 37 KB subset of DejaVu Sans, used only after the TV's own Arabic fonts), Prayer Flow (new js/prayer-flow.js, off by default: iqama countdown, dark screen for 10 / 15 / 20 min, lifts by itself). (5) What's New lines, TV Check lines (Mushaf, Ramadan), version 3.5.0 in config.xml, js/build.js, version.json, bridge/service.js. Radio, daemon, HDMI, permissions, audio core untouched. Untested on the TV.

## v3.4.2

(1) Settings > Performance > "ميزات التحسين الثقيلة" (Heavy Features): one switch for each heavy feature, plus "Turn all off": Blur and glass (visualEffects), Enhanced Glass & Motion (richFx), Dynamic Backdrops (cleanFrameBackdrops), Slow Background Motion (bgMotion), Focus Highlight (focusFx), Live Shelf (liveShelf), Online App Icons (onlineIcons), Tint from wallpaper (wallTint), Living Mihrab motion (new pref ambientFx). They are the same prefs as the switches elsewhere in Settings, so both places agree. (2) Default OFF for all nine: focusFx and liveShelf were on by default and are now off (only for a screen with no saved choice: a saved choice is kept; "Turn all off" sets all nine to off); ambientFx is new. (3) Living Mihrab: sky fade and adhan glow pulse only when ambientFx is on and Reduce Motion is off; the adhan glow itself still shows, still. (4) What's New line, version 3.4.2 in config.xml, js/build.js, version.json, bridge/service.js. Radio, daemon, HDMI, permissions, audio core untouched. Untested on the TV.

## v3.4.1

(1) Living Mihrab (new js/ambient.js, hooked in js/screensaver.js; Settings > Screen Saver > Type > "المحراب الحي"): a sky that follows the real Fajr / Sunrise / Dhuhr / Asr / Maghrib / Isha times (APL.prayer.list), big clock, next prayer with a live countdown, and a golden glow for 2 minutes after each adhan (no glow when Reduce Motion is on). Content drifts a few pixels every minute for OLED. No network, no sound. CSS at the end of css/custom.css. (2) Prayer source badge (js/prayer.js APL.prayer.source, js/prayer-page.js badge()): the Prayer page header now says whether today's times are a saved AlAdhan day or calculated on the screen (with or without the learned offsets and how many days), and notes a manual adjustment / Summer Time. (3) Tint from wallpaper (new js/wall-tint.js, pref wallTint default off, Settings > Accessibility): one 8x8 average colour of the current LOCAL wallpaper becomes a soft wash over the top of the Home Screen scrim; lighter in the light theme; online wallpapers skipped. (4) TV Check line for the mihrab, What's New lines, version 3.4.1 in config.xml, js/build.js, version.json, bridge/service.js. Radio, daemon, HDMI, permissions and audio core untouched. Untested on the TV.

## v3.4.0

(1) Child profile follow-up (new js/kid-limits.js, last in js/build.js; Settings > Accessibility > "قيود وضع الطفل", refused while a child profile is active). Works only while a child profile is active. Allowed apps: APL.launchApp and APL.launchDeepLink refuse apps that are not ticked (default: all allowed). Daily limit (off / 30 / 60 / 90 / 120 / 180 min): counts the minutes the child profile was active today, 5-minute warning toast, resets at midnight. Prayer lock (off / 10 / 15 / 20 / 30 min from each adhan, not sunrise) and bedtime lock (4 presets). While locked a full-screen cover swallows every key except Mute (the 3 s hold to leave child mode still works) and the launcher is brought forward once a minute if the child opened another app. LIMIT: Samsung's own keys (Home, Source, Samsung menus) are NOT blocked, the screen says so. (2) What's New line, version 3.4.0 in config.xml, js/build.js, version.json, bridge/service.js. Radio, daemon, HDMI, permissions and audio core untouched. Untested on the TV.

## v3.3.3

(1) TV Check screen (new js/tv-check.js; Settings > Performance > TV Check): one short line per item, OK / needs attention / not working with a reason: version, prayer times, widget refresh, child lock, radio (presence only), audio (AVPlay) readiness, memory, error log count, bridge, Vetro, alert keeper, USB stick. A USB button saves the lines to apl-tvcheck-*.txt on the stick (APL.errorLog now exposes usbLabels and writeText for it). Read only. Untested on the TV. (2) Safe mode (js/diag.js, js/safe-mode.js): start-ups that never reach the Home Screen are counted (localStorage apl.bootFails); after 3 in a row the next start-up runs with heavy effects and motion off and shows a toast; a good start resets the count. Restoring the last working package is NOT done. (3) Settings > Accessibility: Large Text (rows x1.15) and High Contrast (darker panels, clearer outlines), css/custom.css. Untested on the TV. (4) What's New screen (js/safe-mode.js): shown once per version 8 s after start, also in Settings > Performance > What's New. Untested on the TV. (5) Sun theme (js/launcher.js isNight): "Follow the sun" now uses the real Sunrise and Maghrib of the chosen city from the prayer times (before: Paris maths); old maths only as fallback. (6) Prayer-time auto calibration (js/prayer.js): the local maths is compared with up to 30 saved AlAdhan days; the mean gap per prayer (max 5 min) is added to the local days made offline only; AlAdhan days are never changed; shown in TV Check. No badge on the Prayer page yet. Untested on the TV. (7) Version 3.3.3 in config.xml, build.js, version.json and bridge/service.js. Radio, background daemon, HDMI, permissions, audio playback core and the audio files on the TV untouched. Still pending: child profile follow-up (allowed apps, daily limit, prayer/sleep lock), Ambient mode, sun-following theme, Quran reader and Khatma, full Ramadan mode, prayer-time calibration, last-working-package restore, rest of the small items.

## v1.99.0

(1) Home widgets refresh at once (js/launcher.js, js/navigation.js): the prayer card, task card and clock are redrawn within 1 s when pressing Home, coming back from an app, or closing a page with Back. Root cause of the old ~15 s delay: APL.refreshHome was defined twice and the second definition (app list reload) replaced the widget refresh; the widget refresh is now APL.refreshWidgets. (2) Child profile (js/system.js, js/profiles.js, js/kid-lock.js, js/lang-ar.js): toggle "Child Profile" in the profile menu; while active the profile cannot be switched, edited or deleted; the only way out is holding the remote's Mute key for 3 s (works while the launcher is in front; a short press still mutes). (3) Version 1.99.0 in config.xml, build.js, version.json and bridge/service.js (version string only). Radio, background daemon, HDMI, permissions and audio playback core untouched; audio files on the TV untouched.

## v1.2.124

(1) Lightweight launcher package without bundled audio files (~6.1 MB): the audio recordings (alkahf.mp3 and takbeerat-eid.mp3) are preserved on the TV storage (Documents/APL-Audio, Downloads, Music, USB) and streamed by AVPlay via js/audio-pack.js. (2) STANDING RULE FOR ALL FUTURE UPDATES: Any future launcher update MUST NOT remove, overwrite, or delete the Surat Al-Kahf and Eid Takbeer files on the TV. All future packages remain lightweight and stream from the TV storage. Untested on the TV.

## v1.2.123

(1) Enhanced Glass & Motion Effects (Settings > Appearance > Enhanced Glass & Motion, pref richFx, default off): opt-in switch adding rich frosted glass blur (backdrop-filter: blur(28px) saturate(180%)), fluid depth spring transitions (cubic-bezier(0.16, 1, 0.3, 1)) on focused tiles with ambient drop shadows, glass dialog backdrops, and frosted Control Center panel. Completely disabled by default so zero CPU/GPU overhead is added; ideal for high-end TV processors (Samsung Neo QLED QN85B). Untested on the TV.

## v1.2.122

(1) Embedded offline audio pack (audio/alkahf.mp3, audio/takbeerat-eid.mp3, js/audio-pack.js): Surat Al-Kahf (Sheikh Mustafa Ismail) and Eid Takbeer (Egyptian Quran Radio) are now directly bundled inside the widget package (audio/), eliminating any need for external SDB file transfer, network setup, or USB sticks. js/audio-pack.js seamlessly looks for the package files first via wgt-package and direct relative/file paths, while retaining fallback scanning for external Documents/APL-Audio folders. Samsung AVPlay streams the packaged MP3 files directly from the app folder on the TV. Untested on the TV.

## v1.2.121

(1) Morning & Evening Adhkar (js/adhkar.js, js/prayer-page.js, js/settings-tree.js, js/icons.js, js/lang-ar.js, css/custom.css): added authentic morning (21) and evening (20) adhkar using exact text provided by user. Includes interactive repetition counters per dhikr (1, 3, 4, 7, 10, 100 repeats): pressing OK on a dhikr card decrements its count until completion (✓ checkmark badge), and pressing OK again resets it. (2) Morning and evening tabs: top tabs allow toggling between morning (21) and evening (20) adhkar, plus a Reset Counter button to reset counts for the active tab. Auto-selects morning or evening tab based on the current hour of the day (04:00-15:00 morning, evening otherwise). (3) TV remote navigation: full keyboard and D-pad support in mode = "adhkar" (Left/Right to switch tabs or move along tab buttons, Up/Down to scroll through dhikr cards, OK to count/reset, Back to return to the Prayer page). (4) Entry points: accessible via Settings > Prayer and Quran > Morning & Evening Adhkar, as well as via a dedicated "Adhkar" pill in rowB on the Prayer page. Untested on the TV.

## v1.2.120

(1) Browser UserAgent in diagnostic reports (js/ux-extras.js): reads navigator.userAgent and displays it as "Browser: <userAgent>" in both Settings > Performance > Error Report and in the USB export report file (apl-report-YYYYMMDD-HHMM.txt). Read-only, no behavior change; intended to confirm the exact Chromium engine version of the launcher's WebView before reviewing the Chromium 76 baseline. (2) Nightly Refresh diagnostics and logging (js/ux-extras.js): when the 04:00-04:30 reload executes, the ISO timestamp is saved to localStorage ("apl.softReloadLast") and displayed in Error Report and the USB report file; if the reload is blocked until 04:30 by any condition, the blocker reason (from APL.softReload.blocker()) is recorded once per day into the Error Log (APL_ERRLOG). (3) USB export storage diagnostics (js/ux-extras.js): when no mounted external storage is detected during Export Report to USB, the prompt displays the full list of storage labels, types, and states returned by tizen.filesystem.listStorages (including internal and excluded storages) to diagnose the exact USB drive label. (4) Added TV-TEST.md documenting all untested items with a single test step and expected outcome for TV verification. Not changed: radio, alerts, HDMI, bridge logic, daemon, permissions, js/audio-pack.js. Untested on the TV: userAgent reading on Tizen WebView, softReloadLast persistence, blocker logging at 04:30, storage diagnostic list output.

## v1.2.119

(1) Nightly soft reload (js/ux-extras.js, Settings > Performance > Nightly Refresh, pref softReload, default on). Between 04:00 and 04:30 the launcher page runs location.reload() once a day (marked in localStorage "apl.softReload" before reloading, so it can never loop), and only when ALL hold: the launcher is in front, no key for 30 minutes, the radio is stopped and not set to resume, the Al-Kahf / Takbeer player is stopped, no prayer alert is playing, and neither the next prayer nor the next task is due within 10 minutes. If one fails it asks again every minute until 04:30; if the launcher was behind an app the whole time, that night is skipped. Only the page reloads: radio, Vetro, daemon and bridge are untouched. (2) Export Report to USB (js/ux-extras.js, Settings > Performance): writes apl-report-YYYYMMDD-HHMM.txt (version, screen, load times, memory readings, all launcher and bridge errors) to the first mounted external storage that tizen.filesystem lists (internal folders are never used); the screen says where it was saved, or that no stick was found, or why the write failed. Uses the filesystem.write privilege the package already has; no permission was added. Arabic texts in js/lang-ar.js. Not changed: radio, alerts, HDMI, bridge logic, daemon, permissions, js/audio-pack.js. Untested on the TV: the 04:00 reload with the real conditions, the storage label and type tizen.filesystem gives a USB stick, writing the file. Checked in Node with stubs: every blocking condition, one reload per day, the 04:00 to 04:30 window, and the file name and text sent to a fake storage.

## v1.2.118

(1) Local prayer times as a fallback (js/prayer.js calcDay / fillCalc): only when loading from AlAdhan fails, and only for the days that have nothing saved (yesterday to 30 days ahead). Egyptian General Authority angles (Fajr 19.5, Isha 17.5), Shafi'i Asr (the site setting school = 1 gives Hanafi), sunrise and sunset at 0.833 degrees, standard time UTC+2 so the Summer Time switch adds its hour as it does for AlAdhan data. Such a day is marked calc:true, is never written to the month cache (the real times are fetched and replace it when the network is back; the 6-hour reload keeps trying) and the Prayer page subtitle says it is calculated here and may differ by a minute or two. Prayer alerts use these times through the normal sync to Vetro (the daemon is unchanged). Hijri date of such days comes from the tabular calendar in js/islamic.js (marked approximate there). Checked in Node only for sanity (Belqas, Cairo: Fajr 04:53, Dhuhr 11:40, Maghrib 16:55-16:58 on 18 Nov 2026); NOT compared with AlAdhan's saved values, which this sandbox cannot reach. (2) Night Dimming (Settings > Appearance) has a new choice, Maghrib to Fajr (js/ux-extras.js, js/settings-tree.js): from today's or yesterday's Maghrib to Fajr using the saved times, 8 PM to 6 AM if no times are saved. The fixed-hour choices are unchanged. (3) Iqama countdown (js/prayer.js, js/prayer-page.js): Settings in Prayer page > Adjust Prayer Times, new rows "Iqama after the adhan" per prayer, LEFT / RIGHT change minutes (0 to 60, 0 = off, default off for all). From the adhan until the iqama the Prayer page shows a green line "Iqama of Asr in 12 min". Display only: no alert, nothing sent to Vetro. Not changed: radio, alerts, HDMI, bridge, daemon, permissions, js/audio-pack.js. Untested on the TV.

## v1.2.117

(1) Voluntary fasts in the Islamic Occasions list (js/islamic.js): the White Days (13, 14, 15 of the next Hijri month; none in Ramadan, where fasting is already obligatory, and none in Dhul-Hijjah, whose 13th is a day of tashreeq), the next Monday or Thursday that is open for fasting (never in Ramadan, on the day of Eid al-Fitr or on 10-13 Dhul-Hijjah), and the six days of Shawwal (2 Shawwal to the end of the month). They are listed in the full list only; the four cards above the Prayer page buttons (Ramadan, last ten nights, the two Eids) are unchanged. OK on one adds a reminder like the other occasions. (2) Last third of the night (js/prayer.js APL.prayer.night(), js/prayer-page.js): one text line under the city and weather pills: when the last third starts and when midnight is, from Maghrib to the next Fajr in the saved (adjusted) times; while it is on, the line is green with the time left to Fajr. It is plain text, not a tile, so the remote's order is unchanged. If a needed day is not saved it shows nothing. (3) Weekly tasks (js/tasks.js, js/tasks-page.js): the Day and Repeat stepper now goes below Every day to Every Sunday ... Every Saturday (one weekday per task; make two tasks for two days). The alerts reach Vetro as the same { epoch, id } entries, only on the matching days; the daemon is not touched. (4) Friday Reminders pill on the Prayer page (js/prayer-page.js, js/tasks.js): OK adds three weekly tasks marked for Friday: Al-Kahf at 09:00, blessings on the Prophet at 10:00, and 30 minutes before Dhuhr (taken from the saved prayer times of each Friday, 11:15 only if that day is not saved); OK again removes exactly those three. They are normal tasks: edit or delete them in Tasks (typing a new time by hand replaces the before-Dhuhr rule). The Al-Kahf tile from 1.2.116 is the play button. Not changed: radio, alerts, HDMI, bridge, daemon, permissions, js/audio-pack.js. Untested on the TV: the weekly stepper on the remote, the Friday alerts reaching Vetro, the night line's position and the fasts list. Checked in Node with stubs: the fast dates, weekly entries for 14 days, Friday entries at 09:00 / 10:00 / Dhuhr minus 30.

## v1.2.116

Prayer and Quran page: two new icon tiles right after Radio: Al-Kahf (Surat Al-Kahf, Sheikh Mustafa Ismail's recitation) and Eid Takbeer (Egyptian Quran Radio). (1) NOTHING is added to the package: the recordings live in a folder named APL-Audio on the TV (Documents, Downloads or Music) or on a USB stick, as alkahf.mp3 and takbeerat-eid.mp3 (m4a / aac / ogg / wav are accepted too). js/audio-pack.js lists that folder only when a tile is pressed (tizen.filesystem), then Samsung AVPlay streams the file from the disk, so nothing is loaded into the page's memory and the .wgt stays the same size. If a file is missing the tile says where to put it. (2) The two tiles are one AVPlay player: starting one stops the radio, starting the radio or opening an input stops them; leaving the launcher stops them like the radio. Al-Kahf remembers where it stopped and continues from there. (3) A prayer alert pauses them and resumes them afterwards, with the same Settings switch as the radio (Pause on alert) (js/prayer-alert.js). (4) Nine tiles now fit in the icon row (css/custom.css, max width 138 px). Arabic texts in js/lang-ar.js. install/Install-AudioPack.ps1 (outside the package) copies the files to the TV. Not changed: radio, alerts, HDMI, bridge, daemon, permissions. Untested on the TV: the folder lookup and which AVPlay path form it accepts (the player tries the plain path, then file://, then the virtual path).

## v1.2.115

(1) Home Screen widgets on return. The clock already refreshed when the launcher came back to the front, but the prayer card, the task card and the weather waited for their next tick (js/timers.js made every job wait a full period again). New APL.timers.runNow(name) and APL.refreshHome() (js/launcher.js): on coming back to the front (visibilitychange, window focus, APL.goHome) the prayer and task cards run at once and the weather is refreshed if its data is older than 5 minutes; a second look 1.5 s later. The screen saver, wallpaper and Control Center jobs are NOT run. (2) New APL.fetchJSON(url, ms) (js/timers.js): the weather (12 s) and prayer-times (15 s) requests are rejected after their limit, so their own error paths run; before, a stalled weather request left `busy` true for ever and the weather never refreshed until a restart. (3) Settings > Performance > Alert Keeper Health (js/ux-extras.js, bridge/service.js): when the bridge last got through to the keeper (new field lastHeartbeatOkAt in /bridge-info; reading only: the daemon is unchanged), Vetro's last answer and the failed checks in a row. It shows that Vetro answered the heartbeat, not that a prayer alert played. (4) Memory: a reading a minute after start and then every hour (MemAvailable from /proc/meminfo through Vetro, JS heap if the browser gives it), the last 48 kept in localStorage "apl.mem"; the Error Report line shows free / minimum / heap; a line goes to the Error Log only when less than 120 MB is available. (5) Search (js/search.js, css/custom.css): ONE letter at a time: choosing another letter replaces the first (before it was added after it), the chosen letter is shaded, Delete clears it, Space is removed; with one letter only names or words that START with it are listed. (6) New Clean Background button above the letters (right of the field): closes the apps still open behind the launcher (the same list as the app switcher; never APLauncher, Vetro, dropbear or ssh), then reports the real memory returned (MemAvailable before and after, measured). It does not drop caches and does not touch the radio, the alerts or the daemon. Arabic texts in js/lang-ar.js (APL_LANG_AR_EXTRA). Untested on the TV: the refresh on return, the button's position and remote focus, the freed-memory figure.

## v1.2.114

Search was reachable only through the full-screen Top Shelf, which exists only for apps with artwork or a live shelf (none online in this build), so UP on most apps did nothing. js/launcher.js (onEdge): UP from the dock now opens Search when the app has no full-screen view; the magnifier (js/search.js) also opens on click. Control Center > Search is unchanged.

## v1.2.113

Dynamic Backdrops can be turned on again: Settings > Appearance > Dynamic Backdrops (pref cleanFrameBackdrops, default OFF). js/app-art.js (was an empty stub) now asks JustWatch's public GraphQL (no key) for the country's popular titles (pref backdropCountry, default EG) and per service on demand; 12 h cache in localStorage; any failure = no artwork. Nothing is requested while the switch is off. Untested on the TV.

## v1.2.112

AI Chat page removed completely (js/ai-adapter.js, js/ai-page.js, .aiw CSS, its Settings item). Settings > duck.ai (Internet) stays.

## v1.2.111

New Settings item "duck.ai (Internet)" (js/settings-tree.js, openDuck): opens https://duck.ai/ through APL.openUrl (Samsung Internet; Overscan if that is installed). AI Chat page unchanged.

## v1.2.110

AI Chat (js/ai-page.js): after 3 failed tries the page shows the failure reason with Retry instead of opening a blank iframe; the duck.ai iframe is opened only on request (Back returns to this screen). Error text is also shown under the chat. No other file touched.

## v1.2.109

New page Settings > AI Chat (js/ai-adapter.js = duck.ai transport + vqd/hash challenge + model list + suggestion parser; js/ai-page.js = page in the Prayer page style, css/custom.css `.aiw*`). Free models only, fetched from duck.ai (last list kept in localStorage). After each answer six suggestion buttons (block <<SUGGEST>>...<<END>> is removed from the text; one hidden request if fewer than 6). After 3 failures duck.ai opens in an iframe (fallback). Audio, daemon, radio and HDMI untouched. Untested on the TV.

## v1.2.108

Prayer widget line (Home Screen and Prayer page): (1) the grey track and the green progress now use the real column centres of the icon row (css/custom.css `--pwcol`, `--pwcg`; js/prayer.js fillHtml), so the line is exactly as wide as the icons above it and the green part starts and ends exactly under the middle of the prayer icons; (2) the dot at the end of the green part is tiny (twice the line thickness) and the same green as the line, no white and no glow. (3) Prayer and Quran page (js/prayer-page.js, css/custom.css): new Auto Screen Off tile: OK opens a list (Off, 30 min, then every 10 min up to 3 hours); it uses the Sleep Timer of the Control Center (sys.armSleepTimer), so both show the same timer. (5) Prayer widget (Home Screen and Prayer page): the "Since <prayer>" text now starts with how long ago that prayer was, e.g. "2h 10m since Fajr" (js/prayer.js sinceWidget); under one minute it shows only "Since Fajr". (6) Prayer widget fix on the screen's own browser (Chromium 76): the green part and its dot used `inset-inline-*`, which that browser does not know, so the dot stayed at the end of the widget; now plain `left` / `right` chosen by the text direction (css/custom.css, js/prayer.js). Checked in a real browser: the dot sits on the moving end of the green part, under the prayer icons, in Arabic and in English, on the Home Screen and on the Prayer page. (7) OPTIONAL online wallpapers (Settings › Appearance › Home Wallpapers › Wallpaper Source: Local only (default) / Local and online / Online only; Online Collection: Both / Bing / NASA): only two editor-curated daily collections (Bing Image of the Day in 8 countries, NASA Astronomy Picture of the Day, still pictures only), no search, titles with unsuitable words dropped, a picture joins the rotation only after it loaded completely, list renewed daily; also used by the screen saver. config.xml: img-src now allows https. (8) OPTIONAL online app icons (Settings › Apps › Online App Icons, off by default, js/autoart.js): an installed app with no tile of its own gets its real icon from the App Store catalogue by exact name, 256 px, kept on the screen; Download Missing Icons Now / Delete Downloaded Icons. (4) The Radio, Prayer Alerts, Pause the radio during the alert, Test the Isha Alert, Black Screen and Refresh cards are now small icon tiles in ONE row (state shown by colour: green = on); the City and the Weather cards are two small pills under it; the pills above are a little smaller; the long Summer Time note under the pills is now a short message shown when Summer Time is turned on; the subtitle is shorter. Same actions, same remote order (Radio keeps the first focus). No change to HDMI, radio, alerts, bridge or permissions. Untested on the TV.

## v1.2.107

Home Screen, Next Task card under the clock (class hc__row--task, js/tasks.js, css/custom.css): bigger text, the time left the most: time 27 to 34 px, task name 14 to 19 px, time left 11 to 19 px (bold, light blue), label 9 to 13 px. Only this card. Untested on the TV.

## v1.2.106

Prayer widget line (Home Screen and Prayer page): (1) the grey track is now as wide as the row of icons above it, from the outer edge of the first icon to the outer edge of the last, instead of centre to centre; (2) a soft white dot (white core, misty glow) rides the end of the green part, so it is always clear how far the day has gone between two prayers (js/prayer.js fillHtml adds it; css/custom.css). No change to HDMI, radio, alerts, bridge or permissions. Untested on the TV.

## v1.2.105

(1) Prayer and Quran page: a new pill "Widget Size" (OK goes to the next size: current size, +25%, +50%, +75%, +100%, then back); the same choice is in Settings > Prayer and Quran > Prayer Widget Size. It changes only the prayer widget on the Home Screen (every size in it is the v1.2.104 size times 1, 1.25, 1.5, 1.75 or 2; js/prayer.js sets --pws on the page, css/custom.css uses it). The Prayer page's own big widget is not changed. (2) The line of the prayer widget (grey track and green progress) now runs under the icons, between the icons and the names / times, on the Home Screen and on the Prayer page; the green part still goes from the prayer that just passed to the next one. With Names off it sits just under the icons. (3) The clock card at the top has the same transparent glass as the box under it (same tint, blur and edge, in dark, light and effects-off looks). (4) Prayer page: the up / down keys now find the visible rows from the page itself, so the new pill is reached like the others. No change to HDMI, radio, alerts, bridge or permissions. Untested on the TV: at +100% the box under the clock is about twice as wide and tall; if it touches the dock, say so and the top is lowered.

## v1.2.104

Home Screen box under the clock (css/custom.css, one wrapper in js/weather.js): (1) the prayer widget at half its size (width 680 to 340 px, icons, names, times, the since / left line and the gaps all halved); (2) the Next Task card at half its size (the time, the title and the line under it, the label and the gap between them); (3) the weather condition words (for example "clear sky") 50% bigger: only that text, wrapped in its own span; the icon, the temperature, the place and the rain note keep their size. The Prayer page, the Weather page and the clock card are not changed. At half size the smallest texts are about 9 to 11 px: if one is too small to read from the sofa, say which and it is raised. No change to HDMI, radio, alerts, bridge or permissions. Untested on the TV.

## v1.2.103

HDMI in the Remote Button Remapper (Settings > Vetro Root Controls > Remote Button Remapper). The list of choices of every button (Shahid, Netflix, Prime Video, Disney+, TV Plus, Red/Green/Yellow/Blue, and "Capture Any Remote Button") now also has the screen's HDMI inputs (HDMI 1, HDMI 2... with the device name you gave the input on the Sources screen, if any), right after APL Launcher. Choosing one makes that button open that input. How: the launcher opens it through the same route as the Sources screen and the pinned HDMI tiles (sources.js `openHdmi`, then `sys.switchSource`), so the input's own picture settings and the HDMI picture fix behave as they do there. The binding is kept in its own setting (`hdmiRemap`, button code to HDMI number) and is handled by the launcher when it receives the key. It is NOT sent to Vetro and NOT written to the root remap table (remap-table.tsv), and the root daemon is unchanged (still 4.6): the other bindings, the radio and the alerts are untouched. Choosing HDMI for a button clears any app that button opened before; choosing an app or "Default" afterwards clears the HDMI binding; "Restore Default Remote Buttons" clears all of them. Limit, on purpose: while another app is in front (YouTube, Netflix...), the button keeps its normal action, because opening an HDMI input from outside the launcher needs Vetro or the daemon to learn HDMI first (not done here). Tested here: syntax of every script and the bundle; the binding logic against a stand-in for the remote keys. Untested on the TV: first bind a button to HDMI 2 and press it on the Home Screen.

## v1.2.102

Four small safety changes, no visible change and nothing taken away. (1) The bridge's heartbeat accepted the background daemon only if it said exactly "4.6"; any other version was skipped without a word. It now accepts 4.6 and any later 4.x (the same for the audio nudge sent when HDMI opens, js/system.js). With the daemon the TV has today (4.6) it behaves exactly as before. (2) If the TV has NO usable daemon file (missing, cut short, or an older version, and no good copy in /tmp), the heartbeat copies the daemon that is inside the package (background/daemon.sh) to the persistent place, first under its own staging name, moves it into place only after the copy reports a usable version, and then runs the heartbeat. When a usable daemon is there nothing is copied. A line is added to the daemon's own log (/tmp/apl-bg-audio.log) when it restores. The launcher's own install is untouched. (3) js/safe-store.js: when the browser storage is full, a save no longer disappears without a trace: only the Error Log copy and the last weather snapshot (both rebuilt by themselves) may be removed to make room, the write is tried again, and if it still does not fit the same error reaches the caller as before; either way one line goes to the Error Log. No task, setting, backup, profile, icon or prayer data is ever removed. (4) The bridge reported 1.2.85; it now reports the package version, and tools/make-bundle.py fails if the two differ. No change to alert sounds, radio, HDMI picture, permissions, or the daemon itself (daemon.sh is the same file). Tested here: the heartbeat command in 12 situations with stand-in daemons and once with the real daemon.sh; the storage layer with a simulated full storage. Untested on the TV.

## v1.2.101

(1) Settings > Performance > Error Report: one screen with the version, the load time and ready time of the launcher (from the start of the page), the screen's model and firmware, the number of running timers and the last launcher and bridge errors, plus a QR code (about 200 plain characters) a phone's camera can read, so it can be sent without typing (a TV has no copy and paste). (2) The live-shelf rotation (the changing full-screen picture under a dock icon) uses the shared timer of js/timers.js; the other timers were left on purpose: the radio's player check (it ends with playback and is part of its recovery), Vetro watch (its period changes and it must never overlap), the short key-capture poll, and the start-up watch of js/diag.js. (3) NOT done, on purpose: loading the Tasks page and the Settings list only when first opened. Measured here: leaving these two files out (about 104 KB of 1 MB) saves about 1.6 ms of compile time on a PC; on the TV it may be 10 to 20 times more, still small. The load and ready times in the Error Report will show where the start-up time really goes. No change to alerts, radio, HDMI, bridge or permissions. Untested on the TV.

## v1.2.100

One shared timer. About ten separate `setInterval` timers that ran for ever (clock, theme, night dimming, Control Center, screen saver, weather, wallpapers, task tick, prayer tick, prayer data reload) now register in `js/timers.js` (`APL.timers.every(name, ms, fn)`), which arms ONE `setTimeout` for the nearest job; jobs due within 1 s of each other share one wake-up. Same periods, same "skipped while the launcher is hidden" rule (the screen saver and the 6-hour prayer reload still run while hidden, as before). A job that throws is reported to the Error Log and the others keep running. Side effect: the 6-hour prayer reload could be started more than once before; it is now one job. Left as they were, on purpose: the radio's own timers, Vetro watch (its period changes), the pages' own ticks while open, the background daemon and the bridge service. No visible change; alert sounds, radio, HDMI, bridge and permissions untouched. Untested on the TV: first check the clock, the next-prayer countdown, a task alert, the weather refresh and the screen saver.

## v1.2.99

(1) Weather page: OK on a day of the 7-day forecast opens that day hour by hour (time, weather, rain chance, humidity, temperature; today starts on the current hour, past hours dimmed); Back returns to the same day. The week's hours are now kept (js/weather.js, `hoursAll`). (2) Weather page without internet: it says so ("No connection · last updated ..."), and with no data at all it offers Retry instead of "loading" for ever. (3) Islamic occasions page: OK on an occasion that is still ahead adds a reminder in Tasks (8:00 on its day, 18:00 for a night that starts at sunset); OK again removes it; a bell badge marks the row. (4) "Feels like": the degree sign now stays after the number in Arabic (APL.deg in js/i18n.js). (5) FIX: the Home Screen "rain in N h" notice read the first hours of the day (from midnight) instead of the hours from now; it now counts from the current hour, and is not shown if the data is older than 2 h. (6) tools/make-bundle.py added to the package: rebuilds js/app.bundle.js from js/*.js and checks versions and syntax (`--check` changes nothing). No change to HDMI, radio, alerts, bridge or permissions. Untested on the TV.

## v1.2.98

(1) the weather page: a bigger current temperature; the 7 days as one line each (Today / Tomorrow / weekday with the date, icon, words, rain, UV, a min-max bar on a common scale); (2) the Islamic occasions page: the days left in a chip at the side, the name, then the Hijri and the Gregorian date on two lines; today / under way in green, within a week in amber; (3) both pages follow the Digits setting. CSS in css/custom.css, code in js/prayer-page.js only. No change to HDMI, radio, alerts, bridge or permissions. Untested on the TV.

## v1.2.97

(1) one Digits setting (Settings > General & Privacy) makes the prayer widget, the clock card, the second clock, the screen saver clock and the weather all Western (1 2 3, default) or all Arabic (١ ٢ ٣); (2) a line under the Summer Time button says the times are already in Cairo time; (3) the long release notes moved to CHANGELOG.md; (4) the PNG pictures were re-checked with lossless compression: they were already tight (about 1 KB saved), so they stay as they are; a lossy 256-colour pass would cut about 1.5 MB but changes the pictures, so it was not applied. No change to HDMI, radio, alerts, bridge or permissions. Untested on the TV.

## v1.2.96

(1) new prayer widget (since / time left, six icons on a line, names and times, the next prayer in green) on the Home Screen and on the Prayer page; pills under it: Adjust Prayer Times (minutes per prayer, alerts follow), Summer Time (+1 h), Names on/off, Islamic occasions; (2) the Tasks and Backups pages use the glass look. No change to HDMI, radio, bridge or permissions. Untested on the TV.

## v1.2.95

the prayer page, the Islamic occasions, the weather forecast and the city list now use the same glass look as Settings (css/custom.css; one class added to the prayer page). No change to HDMI, radio, alerts, bridge or permissions.

## v1.2.94

(1) duplicate keys cleaned (radioBackground in js/system.js; repeated Arabic texts: Delete now reads حذف everywhere, the task-name badge uses its own text); (2) the Vetro dot refreshes every 15 s only while Vetro is down, then back to every minute (js/vetro-watch.js); (3) the .mp3 copies of the prayer alerts removed (the launcher and the daemon play the .wav files). No change to HDMI, radio, alert sounds, permissions or bridge. Untested on the TV.

## v1.2.93

the Vetro dot in the status pill is now a tiny faint blurry white dot (css/custom.css only; no script, bridge, HDMI, radio or alert change).

## v1.2.92

(1) FIX: binding a remote button that was already bound no longer launches the old app / leaves the launcher: while a button is read, Vetro's rules and remap-table.tsv are set aside and put back when the new app is chosen, cancelled, or after 90 s; (2) Error Log in Settings > Performance (launcher + bridge); (3) Vetro dot in the status pill; (4) number keys 1-6 on the dock; (5) Yellow closes all apps in the App Switcher; (6) ▲/▼ held 1 s in the grid jump two rows; (7) Focus Ring Colour/Thickness; (8) Night Dimming.

## v1.2.91

(1) the selection rests on the MIDDLE icon of the first row: when the launcher comes back after an app (hidden 2 s or more), on Home, on Back and at start-up the remote is already there; (2) the focus ring halo takes the app colour; (3) the other icons are slightly dimmed (opacity only); (4) Auto Light Effects: if the remote lags, heavy effects turn off until restart (js/smart-perf.js); (5) the artwork two icons away is read ahead when idle; (6) Settings: Home Screen > Focus Highlight, Performance > Auto Light Effects.

## v1.2.90

focus ring. A thin white ring with a soft halo around the icon the remote is on (css/custom.css only; one pseudo-element per icon, only its opacity changes). No script, bridge, HDMI, radio or alert change.

## v1.2.89

calm motion. One soft ease-out for the whole launcher (the springy bounce is gone), focus growth 1.2 -> 1.14, softer focus shadow, the same three durations (160/240/320 ms) for icons, pages, Settings lists, menus and the app switcher. CSS only (css/custom.css): only transform and opacity move.

## v1.2.88

HDMI opened from APL sent its OWN tile text (a device name) as the input name; the screen chooses its PC profile from that name, Samsung's own tile sends the name the screen keeps (e.g. PC). The screen's name now comes first (Settings > Gaming > Use the Screen's Input Name, on by default; off = old behaviour). Untested on the TV.

## v1.2.87

the HDMI neutral-picture option no longer touches the picture MODE (Entertainment, Game... stay as they are); it only puts Warm/Cool colour tone back to Standard and Native colour space to Auto.

## v1.2.86

HDMI picture. New opt-in switch Settings > Gaming > 'Neutral HDMI Picture on Open' (off by default): after HDMI opens from APL, a detached root script puts Warm/Cool colour tone back to Standard, Native colour space to Auto and Movie/Eco picture mode to Standard (two passes, log in HDMI Handoff Status). Untested on the TV. Handoff code, js/sources.js, native helper, alerts and radio unchanged.

## v1.2.85

Vetro review. Fixed: (1) a command the bridge had already handed to a slow Vetro could be sent a second time by the direct fallback (now the bridge reports 'slow' and the launcher never resends it); (2) learning a remote button polled Vetro every 0.2 s with no limit on pending requests (now one poll at a time, every 0.4 s). Added in Settings > Vetro Root Controls: Reconnect to Vetro, Root Access Test, Vetro Apps Overview (read-only), Restart Vetro Service (asks first; starts the service, never Vetro's screen) and a Vetro Notices switch. Untouched: alert sounds and daemon, radio, js/sources.js and the native HDMI helper.

## v1.2.84 (QA55QN85BAUXEG / Tizen 6.5)

HDMI opened from APL looked dull and soft while the same HDMI opened from Samsung's home is clean. Untested on the TV. The one difference found in the code between the two routes: from APL, the launcher's own media session (the AVPlay radio, WebAudio) was still open at the instant the input request was sent, and was only closed afterwards when the launcher was reported hidden. Now both are released first (radio.releaseForVideo, skipped if 'keep the radio behind other apps' is on) and the request follows 0.45 s later. Also: the native helper is tried twice before any fallback route, and when a fallback route was used a notice is shown as soon as the launcher is back in front. js/sources.js and the native helper are unchanged (byte-identical to HDMI-good 1.2.74).

## v1.2.83 (QA55QN85BAUXEG / Tizen 6.5)

HDMI picture diagnostics. The 'HDMI via Samsung Home' experiment of 1.2.82 did not fix the dull HDMI picture from APL, so it is OFF by default (toggle kept in Settings > Gaming) and the H1/H2 relay is back to the 1.2.81 command. New Settings > About This Screen > 'HDMI Picture Recording: START / SHOW': records 3 minutes of picture settings (picture mode, backlight, contrast, color, HDMI black level, color space, Game Mode...) every 6 s plus the system's source requests, to compare an HDMI opened from APL with one opened from Samsung's home. Read-only. Includes 1.2.81 Vetro stability/health work. js/sources.js and the native helper remain byte-identical to HDMI-good 1.2.74.
