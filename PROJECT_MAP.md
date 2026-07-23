# خريطة مشروع "مكتب ثامر بن سلمان العقاري"

> مرجع سريع لفهم بنية المشروع قبل أي تعديل. حدّث هذا الملف يدوياً كل ما تضيف فيتشر كبير جديد.

**المسار المحلي:** `C:\Users\aljuaid\Desktop\thamer-realestate`
**الرابط المباشر:** `https://thamer-realestate.vercel.app`
**التقنيات:** React + Vite + Supabase (PostgreSQL) + Vercel

---

## 1. القاعدة المعمارية الأهم

**ثلاث نقاط دخول، كل واحدة ملف مستقل بالكامل:**

| المسار | الملف | من يشوفه | الصلاحيات |
|---|---|---|---|
| `/` | `App.jsx` (يوزع على باقي ملفات الأدمن) | ثامر (أدمن) | CRUD كامل على كل شي |
| `/view` | `ViewerLayout.jsx` | الوالد (أبو ثامر) | عرض فقط، كل الصفحات |
| `/view2` | `ViewerLimited.jsx` | المحاسب | عرض محدود بعقارات معيّنة + صلاحية إضافة/تعديل حجوزات القاعة فقط (بكلمة سر) |

**⚠️ قاعدة حرجة:** أي تعديل مشترك (فلتر جديد، تصميم بادج، منطق حساب حالة) لازم ينعمل **3 مرات** في الملفات الثلاثة لأنها مستقلة تماماً ولا تتشارك كود. لا يوجد مكوّن مشترك بينها إلا `ExportToolbar.jsx` و`theme.js`.

**التوجيه بين الأدوار** يتم داخل `App.jsx` عبر `window.location.pathname` (`/view`, `/view2`, وإلا صفحة تسجيل الدخول Login.jsx).

---

## 2. خريطة الملفات (src/)

### صفحات الأدمن (تحت `/`)
| ملف | الوظيفة |
|---|---|
| `App.jsx` | الشل الرئيسي: القائمة الجانبية، التوجيه بين الصفحات، لوحة التحكم بالإحصائيات |
| `Properties.jsx` | CRUD العقارات (اسم، نوع، عنوان) |
| `PropertyDetail.jsx` | تفاصيل عقار واحد + وحداته (يفتح من الضغط على اسم العقار) |
| `Units.jsx` | كل الوحدات بكل العقارات، فلترة حسب عقار/حالة |
| `Tenants.jsx` | CRUD المستأجرين + `TenantDetail` (عقود المستأجر) |
| `Leases.jsx` | CRUD العقود، اختيار وحدات متعددة، توليد جدول دفعات تلقائي |
| `Payments.jsx` | تسجيل الدفعات الفعلية، حساب الحالة (مدفوع/جزئي/متأخر/غير مستحق) |
| `Entitlements.jsx` | بحث استحقاقات شهر/سنة معينة + فلاتر (عقار/مستأجر/نوع وحدة) |
| `Reports.jsx` | 4 تقارير: إشغال، عقود منتهية قريباً، وحدات شاغرة، إيرادات |
| `Defaulters.jsx` | المتعثرون + سجل مدفوعاتهم الجزئية |
| `Projects.jsx` | المشاريع والصيانة (مصروفات/إيرادات) |
| `Bookings.jsx` | حجوزات قاعة مذهلة (أدمن) — اعتماد/رفض ما يدخله المحاسب من `/view2` |
| `Login.jsx` | تسجيل دخول الأدمن (Supabase Auth) |
| `components/DashboardCharts.jsx` | رسوم بيانية بالداشبورد (إشغال، دفعات، إيراد بالعقار) |
| `components/ExportToolbar.jsx` | **مشترك بين كل الصفحات** — طباعة/PDF/Excel، مبني على عنصر مخفي مخصص للطباعة |
| `theme.js` | ألوان بادجات نوع الوحدة (`getUnitTypeColor`) وحالة الدفع |

### صفحات العرض (Viewer)
| ملف | الوظيفة |
|---|---|
| `ViewerLayout.jsx` | `/view` — الوالد: كل الصفحات (عقارات، وحدات، مستأجرون، عقود، دفعات، استحقاقات، متعثرون، مشاريع، قاعة مذهلة) — عرض فقط |
| `ViewerLimited.jsx` | `/view2` — المحاسب: مستأجرون/عقود/دفعات/استحقاقات/مشاريع/قاعة مذهلة، مقيّد بـ`ALLOWED_PROPERTY_KEYWORDS`، مع صلاحية إضافة/تعديل حجوزات القاعة (كلمة سر `adil2026`، تُحفظ بحالة `pending` تنتظر اعتماد الأدمن) |

### ملفات أساسية
| ملف | الوظيفة |
|---|---|
| `main.jsx` | نقطة الدخول لـ React |
| `supabaseClient.js` | إعداد اتصال Supabase (من `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| `App.css`, `index.css` | ستايلات عامة (بواقي من قالب Vite الافتراضي، ما تستخدم فعلياً بمعظم الصفحات لأن الكل يستخدم inline styles) |

---

## 3. جداول Supabase الأساسية وعلاقاتها

```
properties (id, name, address, property_type, priority)
    │
    ├── units (id, property_id, unit_number, unit_type, floor, area_sqm, status, notes)
    │       └── unit_type: محل / شقة / ورشة / أرض / غرفة / مجمع / مستودع (ديناميكي، مو ثابت)
    │       └── status: مؤجرة / شاغرة / صيانة
    │
    ├── leases (id, property_id, tenant_id, unit_id [قديم], start_date, end_date,
    │           start_date_hijri, end_date_hijri, rent_amount, payment_type, notes, status)
    │       └── lease_units (lease_id, unit_id)  ← جدول ربط many-to-many (عقد لأكثر من وحدة)
    │       └── payment_type: شهري/ربع سنوي/نصف سنوي/سنوي/كل 4 أشهر/دفعتين
    │
    ├── payments (id, lease_id, amount_due, amount_paid, installment_number,
    │             total_installments, payment_date, payment_date_hijri, payment_method, notes)
    │       └── تُحسب حالتها ديناميكياً (لا يوجد عمود status ثابت بالمنطق الجديد):
    │           paid / partial / overdue (متأخر) / not_due (غير مستحق بعد)
    │
    ├── defaulters (id, tenant_id, total_amount, notes)
    │       └── defaulter_payments (defaulter_id, amount, payment_date, notes)
    │
    ├── bookings (property_id = معرف "قاعة مذهلة" تحديداً)
    │       (event_date_hijri, event_type, client_name, total_amount, deposit_amount,
    │        deposit_receiver_stage1/final, remaining_amount, remaining_status,
    │        remaining_receiver_stage1/final, notes, status, previous_data, needs_review, admin_note)
    │       └── status: approved / pending (من المحاسب) / rejected
    │       └── previous_data: نسخة احتياطية JSON تُستخدم لو الأدمن رفض تعديلاً على حجز معتمد
    │
    └── hall_extra_income (booking_id [اختياري], income_type, amount, date_hijri, client_name, notes)
            └── income_type: ميز / صوتيات / مطبخ القصر / أخرى

tenants (id, name, phone, note, property_id [قديم/اختياري])
projects (id, name, description, date_created, status, expenses, revenues, notes)
```

**ملاحظات مهمة على البيانات:**
- `lease_units` هو المصدر الصحيح لوحدات العقد (many-to-many). عمود `unit_id` على `leases` قديم/احتياطي.
- لا يوجد عمود `status` ثابت على `payments` — الحالة تُحسب في كل صفحة عبر دالة `computeStatus` (تختلف صيغتها قليلاً بين الملفات، راجع القسم 4).
- جدول `bookings` مرتبط بعقار وحيد اسمه بالضبط `"قاعة مذهلة"` — يُجلب `property_id` له بـ query منفصل بكل ملف.

---

## 4. أنماط كود متكررة (نفس الاسم لكن معاد كتابته بكل ملف)

| الدالة/العنصر | الوظيفة | ملاحظة |
|---|---|---|
| `computeStatus(row, hijri?)` | تحسب حالة الدفعة | **تختلف الصيغة بين الملفات:** `Payments.jsx` تستخدم منطق مختلف شوي (`computePaymentStatus`)، أما `Entitlements.jsx`/`ViewerLimited.jsx` تستخدم 4 حالات (paid/partial/overdue/not_due) بينما `ViewerLayout.jsx` تستخدم 3 فقط (paid/partial/unpaid) — **هذا تضارب موجود بالكود الحالي، انتبه له إذا وحّدت المنطق مستقبلاً** |
| `hijriToGregorian(hy, hm, hd)` | تحويل تاريخ هجري لميلادي (خوارزمية جدولية) | مكررة بحرفيتها في: `Entitlements.jsx`, `ViewerLimited.jsx`, `Leases.jsx` (باسم مختلف قليلاً), `Payments.jsx` |
| `computeInstallmentHijri(...)` | تحسب تاريخ استحقاق قسط معيّن بناءً على تاريخ بداية العقد | تُستخدم بـ Entitlements/Payments/ViewerLayout/ViewerLimited |
| `getUnitTypeColor(type)` | لون بادج نوع الوحدة | من `theme.js` (المصدر الوحيد المشترك الفعلي) |
| `propertyBadge`, `tenantBadge`, `activityBadge`, `unitTypeBadge` | دوال JSX لعرض بادجات ملوّنة | معاد تعريفها بكل ملف viewer/entitlements بنفس الألوان تقريباً |
| فلتر متعدد الاختيار (checkbox dropdown) للعقار/المستأجر | نمط UI متكرر (زر + قائمة منسدلة + بحث نصي + تحديد/إلغاء الكل) | نفس البنية بالضبط في تقريباً كل صفحة فيها فلترة، معاد كتابتها يدوياً كل مرة (لا يوجد مكوّن مشترك) |
| `tenantOptionsForProperties(selectedProps)` | تفلتر قائمة أسماء المستأجرين لتُظهر فقط من له عقد بالعقار(ات) المحددة | أُضيفت 23/7/2026 في `ViewerLayout.jsx` و`ViewerLimited.jsx` و`Entitlements.jsx` لحل مشكلة "المستأجر ما يتبع العقار" |
| `allUnitTypes` (useMemo) | قائمة أنواع الوحدات الفعلية الموجودة بالبيانات (ديناميكية، مو hardcoded) | تُبنى من `units` (ViewerLayout) أو من `lease_units` (ViewerLimited/Entitlements) |

---

## 5. فيتشرات خاصة يجب تذكرها

- **كلمة سر تعديل حجوزات القاعة (من `/view2`):** `adil2026` — بملف `ViewerLimited.jsx`، ثابت `HALL_EDIT_PASSWORD`. حماية frontend-only (مو RLS حقيقي).
- **نسبة المصاريف الثابتة لقاعة مذهلة:** تُحفظ بـ`localStorage` مفتاح `bookings_expense_pct`، تُستخدم لحساب "صافي الدخل" في `Bookings.jsx` وكلا ملفي Viewer.
- **آلية اعتماد حجوزات القاعة:** المحاسب (من `/view2`) يضيف/يعدّل حجز → يُحفظ بحالة `pending` → يظهر بلوحة الأدمن (`Bookings.jsx`) للاعتماد/الرفض. لو رفض تعديلاً على حجز كان معتمداً، يرجع الحجز تلقائياً لبياناته القديمة (`previous_data`) مع إشعار (`needs_review` + `admin_note`) يظهر للمحاسب.
- **`ALLOWED_PROPERTY_KEYWORDS`** في `ViewerLimited.jsx`: القائمة الوحيدة اللي تتحكم بأي عقارات يشوفها المحاسب (فلترة بالاسم عبر `.includes()`، مو ID). حالياً: سلمان، إبراهيم، عبدالله الكبيرة، عبدالله الصغيرة.
- **تسجيل الدخول:** فقط `/` (لوحة الأدمن) تتطلب Supabase Auth (إيميل/باسورد). `/view` و`/view2` بدون أي تسجيل دخول — أي شخص عنده الرابط يقدر يدخل.
- **حساب ترتيب العرض:** كل مكان فيه ترتيب (وحدات، مستأجرين، عقود) يتبع أولوية: العقار (`priority` column) ثم نوع الوحدة (محل=1، شقة=2، ورشة=3، غيره=4) ثم رقم الوحدة تصاعدياً.

---

## 6. آخر التعديلات المؤكدة (23 يوليو 2026)

- ✅ فلتر المستأجر أصبح يتبع العقار المحدد (بدل عرض الكل) — في صفحات المستأجرون/العقود/الدفعات/الاستحقاقات بكل من `ViewerLayout.jsx`, `ViewerLimited.jsx`, وصفحة الاستحقاقات في `Entitlements.jsx`.
- ✅ فلتر "نوع الوحدة" (قائمة منسدلة ديناميكية تُبنى من البيانات الفعلية) أُضيف لنفس الصفحات الأربع بنفس الملفات الثلاثة.
- طُبّق عبر سكربت بايثون (`apply_filter_fixes_v2.py`) بدل التعديل اليدوي المباشر — الطريقة المفضّلة لتعديلات نصية دقيقة عبر ملفات متعددة.

---

## 7. تفضيلات سير العمل (ثابتة، راجع دايماً)

- قبل أي أمر تيرمينال: `cd C:\Users\aljuaid\Desktop\thamer-realestate`
- فتح ملف للمراجعة اليدوية: `notepad src\filename.jsx`
- تعديلات JSX: تسليم الملف كامل، مو أجزاء (إلا إذا اتفقنا على سكربت بايثون لتعديلات دقيقة عبر ملفات متعددة)
- أي تسليم كود يرفق رابط محلي (`localhost:5173[/view أو /view2]`) ورابط فيرسل (`thamer-realestate.vercel.app[...]`)
- تعديلات نصوص عربية → بايثون (مو PowerShell here-strings، بسبب مشاكل الترميز)
- أوامر تيرمينال تُرسل دفعة وحدة إذا ممكن
- git: `git add . && git commit -m "..." && git push`
