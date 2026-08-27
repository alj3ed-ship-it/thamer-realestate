# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# --- تعديل 1: منع تعليق html2canvas بسبب @import للخط من الإنترنت داخل نفس الصندوق المُصوَّر ---
old1 = "<style>{`@import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=Tajawal:wght@500&display=swap');`}</style>"
assert content.count(old1) == 1, "old1 not found or not unique"
new1 = ""  # نحذفه من هنا، ونضيفه مرة وحدة في index.html بدلاً من تكراره بكل تصدير
content = content.replace(old1, new1)

# --- تعديل 2: تحميل الخط مرة وحدة عبر useEffect بدل ما يتكرر كل PDF ---
old2 = "useEffect(() => { fetchLeases(); initDate(); }, []);"
assert content.count(old2) == 1, "old2 not found or not unique"
new2 = """useEffect(() => { fetchLeases(); initDate(); }, []);
  useEffect(() => {
    if (document.getElementById("aref-ruqaa-font-link")) return;
    const link = document.createElement("link");
    link.id = "aref-ruqaa-font-link";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=Tajawal:wght@500&display=swap";
    document.head.appendChild(link);
  }, []);"""
content = content.replace(old2, new2)

# --- تعديل 3: عدم قص المحتوى داخل صندوق الخطاب ---
old3 = '              position: "relative",\n              overflow: "hidden",\n            }}'
assert content.count(old3) == 1, "old3 not found or not unique"
new3 = '              position: "relative",\n              overflow: "visible",\n            }}'
content = content.replace(old3, new3)

# --- تعديل 4: مهلة زمنية 15 ثانية لـ html2canvas عشان ما يعلّق للأبد ---
old4 = """      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        // ملاحظة: جربنا foreignObjectRendering:true لإصلاح تفكك حروف "فال"، لكنه
        // سبب صفحة PDF فاضية بالكامل. الإصلاح الفعلي والكافي كان حذف unicode-bidi
        // المفروض على أرقام التصاريح بالأسطر أعلاه — false هو الإعداد الصحيح والمستقر.
        foreignObjectRendering: false,
      });"""
assert content.count(old4) == 1, "old4 not found or not unique"
new4 = """      const canvasPromise = html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        // ملاحظة: جربنا foreignObjectRendering:true لإصلاح تفكك حروف "فال"، لكنه
        // سبب صفحة PDF فاضية بالكامل. الإصلاح الفعلي والكافي كان حذف unicode-bidi
        // المفروض على أرقام التصاريح بالأسطر أعلاه — false هو الإعداد الصحيح والمستقر.
        foreignObjectRendering: false,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("انتهت المهلة أثناء تجهيز الملف — حاول مرة أخرى")), 15000)
      );
      const canvas = await Promise.race([canvasPromise, timeoutPromise]);"""
content = content.replace(old4, new4)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — 4 تعديلات")
