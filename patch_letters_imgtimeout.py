# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """      const imgs = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })
      );"""
assert content.count(old) == 1, "old not found or not unique"

new = """      const imgs = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return Promise.race([
            new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
            // مهلة أمان: بعض الصور الملصوقة من Word (رموز/أشكال مخفية) لا تكتمل
            // تحميلها أبداً ولا تطلق load ولا error، فتعلّق العملية للأبد بدون هذا الحد.
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
        })
      );"""
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — إضافة مهلة أمان لتحميل الصور")
