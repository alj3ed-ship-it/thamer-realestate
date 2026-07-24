# -*- coding: utf-8 -*-

path = r"src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''    setLoading(true);
    try {
      // نُظهر العنصر فعلياً فوق الشاشة (طبقة بيضاء كاملة) وقت التصوير بالضبط.
      // هذا يضمن إن المتصفح رسم المحتوى فعلياً قبل أي محاولة تصوير —
      // التخبئة البعيدة عن الشاشة كانت تعطي أحياناً صورة فارغة رغم عدم وجود أي خطأ برمجي.
      // نرجّع الصفحة لأعلى قبل التصوير — مكتبة html2canvas فيها خلل معروف
      // مع عناصر position:fixed لما تكون الصفحة ممرّرة (scrolled)، يسبب قطع
      // بأعلى الصورة الملتقطة بمقدار مسافة التمرير بالضبط.
      window.scrollTo(0, 0);
      setIsCapturing(true);'''

new_block = '''    setLoading(true);
    // إصلاح (يوليو 2026): على الشاشات الضيقة (جوال)، قاعدة overflow-x:hidden
    // بملف index.css (المستخدمة لمنع التمرير الأفقي العام بالموقع) كانت تقص
    // فعلياً أي جزء من طبقة التصوير (عرضها 1700px) يتجاوز عرض الشاشة الظاهر،
    // وهذا يسبب اختفاء الأعمدة الأخيرة بتقرير PDF. نلغيها مؤقتاً بس أثناء
    // لحظة التصوير الفعلية، ونرجعها فوراً بعد كذا بالـ finally أدناه —
    // هذا ما يرجّع مشكلة الصفحة البيضاء لأنه مؤقت جداً ومحصور بلحظة التصوير.
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    const prevBodyOverflowX = document.body.style.overflowX;
    try {
      // نُظهر العنصر فعلياً فوق الشاشة (طبقة بيضاء كاملة) وقت التصوير بالضبط.
      // هذا يضمن إن المتصفح رسم المحتوى فعلياً قبل أي محاولة تصوير —
      // التخبئة البعيدة عن الشاشة كانت تعطي أحياناً صورة فارغة رغم عدم وجود أي خطأ برمجي.
      // نرجّع الصفحة لأعلى قبل التصوير — مكتبة html2canvas فيها خلل معروف
      // مع عناصر position:fixed لما تكون الصفحة ممرّرة (scrolled)، يسبب قطع
      // بأعلى الصورة الملتقطة بمقدار مسافة التمرير بالضبط.
      window.scrollTo(0, 0);
      document.documentElement.style.overflowX = "visible";
      document.body.style.overflowX = "visible";
      setIsCapturing(true);'''

if old_block not in content:
    print("❌ لم يتم العثور على الكتلة المطلوبة (block 1) — تحقق من الملف يدوياً")
else:
    content = content.replace(old_block, new_block)

old_finally = '''    } finally {
      setIsCapturing(false);
      setLoading(false);
    }
  };'''

new_finally = '''    } finally {
      document.documentElement.style.overflowX = prevHtmlOverflowX;
      document.body.style.overflowX = prevBodyOverflowX;
      setIsCapturing(false);
      setLoading(false);
    }
  };'''

if old_finally not in content:
    print("❌ لم يتم العثور على كتلة finally (block 2) — تحقق من الملف يدوياً")
else:
    content = content.replace(old_finally, new_finally)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تعديل handlePDF بنجاح")
