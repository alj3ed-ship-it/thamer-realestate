# -*- coding: utf-8 -*-

path = r"src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''      const canvas = await html2canvas(node, {
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

new_block = '''      // إصلاح (يوليو 2026 - محاولة رابعة، مبنية على تشخيص فعلي): تأكدنا إن حجم
      // الكانفاس صحيح تماماً (3400x838 = 1700x419 * scale 2) على الجهاز الحقيقي،
      // يعني المشكلة مو بحجم الالتقاط، لكن بمحتواه — foreignObjectRendering:true
      // (يعتمد على SVG لرسم المحتوى) معروف بخلل على متصفحات الجوال (Safari/
      // Chrome iOS) يسبب رسم جزئي/فاضي لمحتوى أعرض من الشاشة الفعلية. نعطّله
      // هنا ونخلي المكتبة تستخدم طريقتها الاحتياطية (رسم كل عنصر يدوياً)، أكثر
      // توافقاً مع الجوال ولو أبطأ شوي.
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        foreignObjectRendering: false,
      });'''

if old_block not in content:
    print("❌ لم يتم العثور على الكتلة المطلوبة — تحقق يدوياً")
else:
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تعطيل foreignObjectRendering وحذف رسالة التشخيص بنجاح")
