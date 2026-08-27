# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """            {(() => {
              const TABLE_MARKER = "{{الجدول}}";
              if (pasteMode && bodyText.includes(TABLE_MARKER)) {
                const [beforeText, afterText] = bodyText.split(TABLE_MARKER);"""
assert content.count(old) == 1, "old not found or not unique"

new = """            {(() => {
              // نتقبّل أي مسافات زائدة جوه القوسين، مثل {{ الجدول }} أو {{الجدول}}
              const TABLE_MARKER_RE = /\\{\\{\\s*الجدول\\s*\\}\\}/;
              const markerMatch = bodyText.match(TABLE_MARKER_RE);
              if (pasteMode && markerMatch) {
                const beforeText = bodyText.slice(0, markerMatch.index);
                const afterText = bodyText.slice(markerMatch.index + markerMatch[0].length);"""
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — العلامة تتقبّل المسافات الزائدة الآن")
