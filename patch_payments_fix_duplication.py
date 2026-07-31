path = r"src\Payments.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) إصلاح التكرار عند زر "تسجيل دفعة"
old1 = '''        {!isReadOnly && (
        {!isReadOnly && (
        <button onClick={openAdd} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + تسجيل دفعة
        </button>
        )}
        )}'''
new1 = '''        {!isReadOnly && (
        <button onClick={openAdd} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + تسجيل دفعة
        </button>
        )}'''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ تم إصلاح التكرار عند زر تسجيل دفعة")
else:
    print("❌ لم يتم العثور على نمط التكرار عند زر تسجيل دفعة")

# 2) إصلاح التكرار عند عمود أزرار تعديل/حذف
old2 = '''                      {!isReadOnly && (
                      {!isReadOnly && (
                      <td style={{ padding: '12px' }} className="no-print">
                        <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                          {deletingId === p.id ? '...' : 'حذف'}
                        </button>
                      </td>
                      )}
                      )}'''
new2 = '''                      {!isReadOnly && (
                      <td style={{ padding: '12px' }} className="no-print">
                        <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                          {deletingId === p.id ? '...' : 'حذف'}
                        </button>
                      </td>
                      )}'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ تم إصلاح التكرار عند عمود أزرار تعديل/حذف")
else:
    print("❌ لم يتم العثور على نمط التكرار عند عمود الأزرار")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم إصلاح الملف بالكامل ({len(changes_made)}/2)" if len(changes_made) == 2 else f"\n⚠️ لم يكتمل الإصلاح ({len(changes_made)}/2) — أرسل محتوى الملف الحالي فوراً")
