path = r"src\Tenants.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# الخطوة 1: نحذف الـ return المبكر من مكانه الحالي (قبل الـ useEffect الثالث)
old1 = '''    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (selectedTenant) return <TenantDetail tenant={selectedTenant} onBack={() => setSelectedTenant(null)} />

  function openAddForm() {'''

new1 = '''    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function openAddForm() {'''

# الخطوة 2: نضيف الـ return بعد آخر useEffect (بعد كل الـ Hooks) وقبل حساب filtered
old2 = '''    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProperty])

  const filtered = (filterProperty === 'الكل\''''

new2 = '''    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProperty])

  if (selectedTenant) return <TenantDetail tenant={selectedTenant} onBack={() => setSelectedTenant(null)} />

  const filtered = (filterProperty === 'الكل\''''

if old1 not in content:
    print("❌ لم يتم العثور على النص الأول (الحذف). تحقق من الملف يدوياً.")
elif old2 not in content:
    print("❌ لم يتم العثور على النص الثاني (الإضافة). تحقق من الملف يدوياً.")
else:
    content = content.replace(old1, new1)
    content = content.replace(old2, new2)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم إصلاح Tenants.jsx: نُقل الـ return المبكر لبعد كل الـ Hooks. الصفحة البيضاء لازم تنحل الآن.")
