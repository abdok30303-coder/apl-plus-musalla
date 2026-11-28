# Install Salah Launcher on your Samsung TV with Apps2Samsung

**English** · [العربية](#التثبيت-على-شاشة-سامسونج-بواسطة-apps2samsung)

Apps2Samsung is a free tool that installs apps on Samsung TVs from your computer or phone. You do **not** need to know anything about programming.

## What you need
- A Samsung Smart TV from **2022 or newer** (Tizen 6.5+).
- A computer (Windows, macOS or Linux) or a phone, connected to the **same Wi-Fi / network as the TV**.
- The file **`salah-launcher-v8.7.67.wgt`** from the [Releases page](../../../releases).
- The **Apps2Samsung** tool: <https://github.com/Apps2Samsung/Apps2Samsung/releases> (homepage: apps2samsung.madebypatrick.nl).

## Step 1 — Open Apps2Samsung and get your computer's IP
1. Download and open the **Apps2Samsung** tool on your computer (link below).
2. Click the **Settings** (gear) icon, then under **Local IP** choose your active connection (**Ethernet** or **Wi-Fi**). The tool shows your computer's IP address next to it (it looks like `192.168.1.25`) — write it down.
   > If nothing useful shows up there, open Command Prompt on Windows, type `ipconfig` and press Enter — the number next to **IPv4 Address** is the same thing.

## Step 2 — Turn on Developer Mode on the TV
1. Press **Home** (Smart Hub) on the remote and open **Apps**.
2. Type **12345** with the remote's number buttons. If your remote has no numbers, press the **123** button and type it on the screen.
   > **2024 TV or newer, or nothing happens?** Open **Apps**, scroll down and open **App Settings** (sometimes labelled **App Management**) at the bottom of the Apps screen, then type **12345** there instead.
3. Switch **Developer mode** to **On**.
4. Type your computer's IP address from Step 1, then press **OK**.
5. **Restart the TV** (hold the power button until it restarts, or unplug it for 5 seconds). When you open **Apps** again, you should see "Developer Mode" at the top.

> **Arabic TV menus:** if your TV is set to a right-to-left language, it may flip the IP backwards (`192.168.1.2` becomes `2.1.168.192`). If that happens, type the IP **in reverse order** when you enter it.
> Menu names differ a little between TV models and years.

## Step 3 — Install with Apps2Samsung
1. Open the Apps2Samsung tool on your computer.
2. Select your TV from the list.
3. Choose to install a **custom `.wgt`** file and pick `salah-launcher-v8.7.67.wgt`.
4. Press **Install** and wait for the success message.
5. If the tool asks you to sign in with a free **Samsung developer account** (it can on Tizen 7 and newer TVs), follow its on-screen steps.

## Step 4 — Open the app
On the TV open **Apps**: **Salah Launcher** is in the list. Open it and enjoy.

## If something goes wrong
| Problem | Try this |
| --- | --- |
| The TV is not found | TV is on, same network as the computer, Developer Mode is **On**, and the IP in Developer Mode matches the computer's IP. |
| The IP looks backwards | Re-enable Developer Mode and enter the IP in reverse order (see the note above). |
| Install fails or an older copy exists | Delete the old copy first: hold **OK** on the app and choose **Delete**. Then install again. |
| Nothing changed after turning on Developer Mode | You must **restart** the TV, not only turn it off and on from standby. |
| The `12345` code does nothing | Use the **123** button, or the SmartThings phone app's keypad to enter it. |

Sideloading is done at your own risk, and enabling Developer Mode can affect support on some TVs. Turn it off when you are done if you prefer.

---

# التثبيت على شاشة سامسونج بواسطة Apps2Samsung

أداة **Apps2Samsung** مجانية، بتثبّت التطبيقات على شاشة سامسونج من الكمبيوتر أو الموبايل. مش محتاج أي خبرة برمجة.

## المطلوب
- شاشة سامسونج ذكية موديل **2022 أو أحدث** (Tizen 6.5 فما فوق).
- كمبيوتر (ويندوز أو ماك أو لينكس) أو موبايل، على **نفس شبكة الواي فاي بتاعة الشاشة**.
- ملف **`salah-launcher-v8.7.67.wgt`** من صفحة [Releases](../../../releases).
- أداة **Apps2Samsung**: <https://github.com/Apps2Samsung/Apps2Samsung/releases>

## الخطوة 1: افتح Apps2Samsung واعرف رقم IP بتاع الكمبيوتر
1. نزّل أداة **Apps2Samsung** وافتحها على الكمبيوتر (الرابط تحت).
2. ادخل على أيقونة **Settings** (الترس)، وتحت **Local IP** اختار الاتصال الشغال عندك (**Ethernet** أو **Wi-Fi**). الأداة بتوريك رقم IP الكمبيوتر جنبه (شكله `192.168.1.25`) — اكتبه.
   > لو مفيش حاجة واضحة ظهرت، افتح Command Prompt على ويندوز، اكتب `ipconfig` واضغط Enter — الرقم اللي جنب **IPv4 Address** هو نفسه.

## الخطوة 2: فعّل وضع المطوّر على الشاشة
1. اضغط **Home** في الريموت وافتح **Apps**.
2. اكتب **12345** بأزرار الأرقام. لو الريموت من غير أرقام، اضغط زر **123** واكتبها على الشاشة.
   > **شاشة 2024 أو أحدث، أو مفيش حاجة حصلت؟** جوه شاشة **Apps**، انزل لتحت ودوّر على **App Settings** (وممكن تلاقيها باسم **إدارة التطبيقات / App Management**)، واكتب **12345** هناك بدل الشاشة الرئيسية لـ Apps.
3. شغّل **Developer mode** على **On**.
4. اكتب رقم IP الكمبيوتر من الخطوة 1 واضغط **OK**.
5. **أعد تشغيل الشاشة** (اضغط زر الباور فترة لحد ما تعيد التشغيل، أو افصل الكهربا 5 ثواني). لما تفتح **Apps** تاني هتلاقي كلمة Developer Mode فوق.

> **لو قايمة الشاشة عربي:** ساعات الشاشة بتعكس رقم الـ IP (`192.168.1.2` يبقى `2.1.168.192`). لو حصل كده، اكتب الـ IP **معكوس الترتيب**.
> أسماء القوايم بتختلف شوية من موديل لموديل.

## الخطوة 3: التثبيت بـ Apps2Samsung
1. افتح أداة Apps2Samsung على الكمبيوتر.
2. اختار شاشتك من القايمة.
3. اختار تثبيت ملف **`.wgt` مخصص** وحدد `salah-launcher-v8.7.67.wgt`.
4. اضغط **Install** واستنى رسالة النجاح.
5. لو طلبت منك الأداة تسجيل الدخول بحساب **مطوّر سامسونج** (مجاني)، وده ممكن يحصل على شاشات Tizen 7 وأحدث، كمّل بالخطوات اللي بتظهر.

## الخطوة 4: افتح التطبيق
على الشاشة افتح **Apps** وهتلاقي **Salah Launcher** في القايمة. افتحه واستمتع.

## لو حصلت مشكلة
| المشكلة | الحل |
| --- | --- |
| الأداة مش لاقية الشاشة | الشاشة شغالة، ونفس الشبكة، ووضع المطوّر **On**، والـ IP المكتوب في الشاشة نفس رقم الكمبيوتر. |
| الـ IP ظاهر معكوس | أعد تفعيل وضع المطوّر واكتب الـ IP معكوس الترتيب. |
| التثبيت فشل أو في نسخة قديمة | امسح النسخة القديمة: اضغط مطوّلًا على **OK** على التطبيق واختار **Delete**، وبعدين ثبّت تاني. |
| مفيش تغيير بعد تفعيل وضع المطوّر | لازم **إعادة تشغيل** كاملة للشاشة، مش مجرد إطفاء وتشغيل من وضع الانتظار. |
| الكود `12345` مش بيشتغل | استخدم زر **123**، أو لوحة مفاتيح تطبيق SmartThings على الموبايل. |

التثبيت بيتم على مسؤوليتك، وتفعيل وضع المطوّر ممكن يأثر على الدعم في بعض الشاشات. تقدر تقفله بعد ما تخلص.
