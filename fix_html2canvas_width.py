# -*- coding: utf-8 -*-

path = r"src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        foreignObjectRendering: true,
      });'''

new_block = '''      // إصلاح (يوليو 2026 - محاولة ثالثة): على شاشة جوال حقيقية ضيقة، html2canvas
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

if old_block not in content:
    print("❌ لم يتم العثور على كتلة html2canvas — تحقق من الملف يدوياً")
else:
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تعديل استدعاء html2canvas بنجاح")
