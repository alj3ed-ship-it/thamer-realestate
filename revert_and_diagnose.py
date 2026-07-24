# -*- coding: utf-8 -*-

path = r"src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) نتراجع عن تعديل windowWidth (سبب مشكلة أسوأ) ونرجع للإعدادات البسيطة
old_html2canvas = '''      // إصلاح (يوليو 2026 - محاولة ثالثة): على شاشة جوال حقيقية ضيقة، html2canvas
      // افتراضياً يصوّر بناءً على عرض الشاشة الفعلي (windowWidth) مو عرض العنصر
      // (1700px)، فيقص الأعمدة الأخيرة بغض النظر عن overflow. نجبر windowWidth/
      // windowHeight على حجم العنصر نفسه (node.scrollWidth/Height)، ونثبّت
      // x/y/scrollX/scrollY بالصفر عشان نفادي انزياح الموقع (اللي صار بمحاولة
      // سابقة وقصّ أول عمودين بدل الأخيرين).
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        foreignObjectRendering: true,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });'''

new_html2canvas = '''      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        foreignObjectRendering: true,
      });

      // تشخيص مؤقت (يوليو 2026): نطلع أرقام حقيقية من الجهاز الفعلي بدل التخمين.
      // احذف هذا الجزء بعد ما نشخص المشكلة.
      alert(
        "تشخيص:\\n" +
        "canvas: " + canvas.width + " x " + canvas.height + "\\n" +
        "node.scrollWidth/Height: " + node.scrollWidth + " x " + node.scrollHeight + "\\n" +
        "window.innerWidth: " + window.innerWidth + "\\n" +
        "devicePixelRatio: " + window.devicePixelRatio
      );'''

if old_html2canvas not in content:
    print("❌ لم يتم العثور على كتلة html2canvas الحالية — تحقق يدوياً")
else:
    content = content.replace(old_html2canvas, new_html2canvas)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم التراجع عن windowWidth واضافة رسالة التشخيص بنجاح")
