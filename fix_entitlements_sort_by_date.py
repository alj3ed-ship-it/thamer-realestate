import io

path = "src/Entitlements.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1) أضف مفتاح ترتيب التاريخ عند بناء كل صف (juste قبل sortType/sortNum)
old1 = '''      let sortType = 99;
      let sortNum = 999;
      units.forEach((u) => {
        const t = UNIT_TYPE_ORDER[u.unit_type] || 4;
        const n = parseInt(u.unit_number) || 999;
        if (t < sortType || (t === sortType && n < sortNum)) {
          sortType = t;
          sortNum = n;
        }
      });'''
new1 = '''      let sortType = 99;
      let sortNum = 999;
      units.forEach((u) => {
        const t = UNIT_TYPE_ORDER[u.unit_type] || 4;
        const n = parseInt(u.unit_number) || 999;
        if (t < sortType || (t === sortType && n < sortNum)) {
          sortType = t;
          sortNum = n;
        }
      });
      const dueSortKey = hijri.year * 10000 + hijri.month * 100 + hijri.day;'''
replacements.append((old1, new1))

# 2) أضف الحقل لكائن found.push
old2 = '''        unit: units.map((u) => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—",
        units,
        sortType, sortNum,'''
new2 = '''        unit: units.map((u) => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—",
        units,
        sortType, sortNum, dueSortKey,'''
replacements.append((old2, new2))

# 3) عدّل الترتيب النهائي: التاريخ أولاً، ثم نوع الوحدة، ثم رقمها
old3 = '''    found.sort((a, b) => {
      if (a.propertyPriority !== b.propertyPriority) return a.propertyPriority - b.propertyPriority;
      if (a.sortType !== b.sortType) return a.sortType - b.sortType;
      return a.sortNum - b.sortNum;
    });'''
new3 = '''    found.sort((a, b) => {
      if (a.propertyPriority !== b.propertyPriority) return a.propertyPriority - b.propertyPriority;
      if (a.dueSortKey !== b.dueSortKey) return a.dueSortKey - b.dueSortKey;
      if (a.sortType !== b.sortType) return a.sortType - b.sortType;
      return a.sortNum - b.sortNum;
    });'''
replacements.append((old3, new3))

for i, (old, new) in enumerate(replacements, 1):
    count = content.count(old)
    assert count == 1, f"replacement #{i} matched {count} times (expected 1)"
    content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم ترتيب الاستحقاقات حسب التاريخ داخل كل عقار ✅")