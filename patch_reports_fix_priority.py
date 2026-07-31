# -*- coding: utf-8 -*-
FILE = "src/Reports.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

old_fn = '''  function getPropertyPriority(name) {
    if (!name) return 99;
    if (name.includes("سلمان") && !name.includes("عبدالله")) return 1;
    if (name.includes("إبراهيم")) return 2;
    if (name.includes("عبدالله الكبيرة")) return 3;
    if (name.includes("عبدالله الصغيرة")) return 4;
    return 99;
  }'''

new_fn = '''  function normalizeArabic(str) {
    return (str || "")
      .replace(/[إأآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  }

  function getPropertyPriority(name) {
    const n = normalizeArabic(name);
    if (!n) return 99;
    if (n.includes("سلمان") && !n.includes("عبدالله")) return 1;
    if (n.includes("براهيم")) return 2;
    if (n.includes("عبدالله الكبيره")) return 3;
    if (n.includes("عبدالله الصغيره")) return 4;
    return 99;
  }'''

if old_fn not in content:
    raise SystemExit("PATCH FAILED: getPropertyPriority function not found — aborting safely.")
content = content.replace(old_fn, new_fn)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم إصلاح ترتيب الأولوية في Reports.jsx")
