path = r"src\Defaulters.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly
old1 = '''import { supabase } from "./supabaseClient";
import ExportToolbar from "./components/ExportToolbar";

export default function Defaulters({ onBack, onCreateLetter }) {'''
new1 = '''import { supabase } from "./supabaseClient";
import { useReadOnly } from "./ReadOnlyContext";
import ExportToolbar from "./components/ExportToolbar";

export default function Defaulters({ onBack, onCreateLetter }) {
  const isReadOnly = useReadOnly();'''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly + استدعاء الـ hook")
else:
    print("❌ لم يتم العثور على بداية مكون Defaulters")

# 2) إخفاء زر "+ إضافة متعثر"
old2 = '''      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + إضافة متعثر
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
      </div>'''
new2 = '''      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {!isReadOnly && (
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + إضافة متعثر
        </button>
        )}
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
      </div>'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ إخفاء زر إضافة متعثر")
else:
    print("❌ لم يتم العثور على زر إضافة متعثر")

# 3) إخفاء أزرار (إنشاء خطاب / تعديل / حذف) بكل بطاقة متعثر
old3 = '''                    <div className="no-print" style={{ display: "flex", gap: 6 }}>
                      {onCreateLetter && (
                        <button onClick={e => {
                          e.stopPropagation();
                          const t = getTenant(d.tenant_id);
                          onCreateLetter({
                            tenant: t?.name || "",
                            amount: getRemaining(d).toLocaleString(),
                            unit: d.notes || "",
                            property: "",
                          });
                        }}
                          style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0e8c8", background: "#eefff2", color: "#166534", cursor: "pointer" }}>
                          📄 إنشاء خطاب
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); openEditForm(d); }}
                        style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer" }}>تعديل</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} disabled={deletingId === d.id}
                        style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                        {deletingId === d.id ? "..." : "حذف"}
                      </button>
                    </div>'''
new3 = '''                    {!isReadOnly && (
                    <div className="no-print" style={{ display: "flex", gap: 6 }}>
                      {onCreateLetter && (
                        <button onClick={e => {
                          e.stopPropagation();
                          const t = getTenant(d.tenant_id);
                          onCreateLetter({
                            tenant: t?.name || "",
                            amount: getRemaining(d).toLocaleString(),
                            unit: d.notes || "",
                            property: "",
                          });
                        }}
                          style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0e8c8", background: "#eefff2", color: "#166534", cursor: "pointer" }}>
                          📄 إنشاء خطاب
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); openEditForm(d); }}
                        style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer" }}>تعديل</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} disabled={deletingId === d.id}
                        style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                        {deletingId === d.id ? "..." : "حذف"}
                      </button>
                    </div>
                    )}'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء أزرار إنشاء خطاب/تعديل/حذف")
else:
    print("❌ لم يتم العثور على أزرار إنشاء خطاب/تعديل/حذف")

# 4) إخفاء زر "+ إضافة دفعة"
old4 = '''                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h4 style={{ margin: 0, color: "#1B4D7A" }}>سجل المدفوعات</h4>
                        <button onClick={() => { setShowPaymentForm(true); }}
                          style={{ padding: "6px 14px", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                          + إضافة دفعة
                        </button>
                      </div>'''
new4 = '''                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h4 style={{ margin: 0, color: "#1B4D7A" }}>سجل المدفوعات</h4>
                        {!isReadOnly && (
                        <button onClick={() => { setShowPaymentForm(true); }}
                          style={{ padding: "6px 14px", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                          + إضافة دفعة
                        </button>
                        )}
                      </div>'''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء زر إضافة دفعة")
else:
    print("❌ لم يتم العثور على زر إضافة دفعة")

# 5) إخفاء رأس عمود الحذف وزر الحذف بجدول المدفوعات
old5 = '''                          <thead>
                            <tr style={{ textAlign: "right" }}>
                              {["المبلغ", "التاريخ", "ملاحظات", ""].map(h => ('''
new5 = '''                          <thead>
                            <tr style={{ textAlign: "right" }}>
                              {(isReadOnly ? ["المبلغ", "التاريخ", "ملاحظات"] : ["المبلغ", "التاريخ", "ملاحظات", ""]).map(h => ('''
if old5 in content:
    content = content.replace(old5, new5)
    changes_made.append("✅ إخفاء رأس عمود الحذف بجدول المدفوعات")
else:
    print("❌ لم يتم العثور على رأس جدول المدفوعات")

old6 = '''                                <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{p.notes || "—"}</td>
                                <td style={{ padding: "8px 12px" }}>
                                  <button onClick={() => handleDeletePayment(p.id)}
                                    style={{ padding: "3px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>حذف</button>
                                </td>'''
new6 = '''                                <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{p.notes || "—"}</td>
                                {!isReadOnly && (
                                <td style={{ padding: "8px 12px" }}>
                                  <button onClick={() => handleDeletePayment(p.id)}
                                    style={{ padding: "3px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>حذف</button>
                                </td>
                                )}'''
if old6 in content:
    content = content.replace(old6, new6)
    changes_made.append("✅ إخفاء زر حذف الدفعة")
else:
    print("❌ لم يتم العثور على زر حذف الدفعة")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم تحديث Defaulters.jsx بالكامل ({len(changes_made)}/6)" if len(changes_made) == 6 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/6)")
