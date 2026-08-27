# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """      const canvasPromise = html2canvas(node, {
        scale: 2,
        useCORS: true,"""
assert content.count(old) == 1, "old not found or not unique"

new = """      const canvasPromise = html2canvas(node, {
        scale: 3,
        useCORS: true,"""
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — رفع دقة تصدير PDF من 2x إلى 3x")
