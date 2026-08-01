# -*- coding: utf-8 -*-
"""
يضيف بطاقات ملخص (عدد الحجوزات + الإجمالي + دخل إضافي + الإجمالي الكلي + صافي الدخل)
لتصدير PDF/طباعة تبويب "قاعة مذهلة" بصفحتي الوالد (ViewerLayout.jsx) والمحاسب (ViewerLimited.jsx)
"""

files = ["src/ViewerLayout.jsx", "src/ViewerLimited.jsx"]

old_block = """                <ExportToolbar
                  data={bookingsFiltered.map(b => ({
                    date: b.event_date_hijri ? `${formatHijriDisplay(b.event_date_hijri)} هـ` : "—",
                    type: b.event_type || "—",
                    client: b.client_name || "—",
                    total: `${Number(b.total_amount || 0).toLocaleString()} ر.س`,
                    deposit: `${Number(b.deposit_amount || 0).toLocaleString()} ر.س`,
                    remaining: `${Number(b.remaining_amount || 0).toLocaleString()} ر.س`,
                    status: b.remaining_status || "—",
                    finalReceiver: b.remaining_receiver_final || "—",
                  }))}
                  columns={[
                    { key: "date", label: "التاريخ الهجري" },
                    { key: "type", label: "النوع" },
                    { key: "client", label: "العميل" },
                    { key: "total", label: "الإجمالي" },
                    { key: "deposit", label: "العربون" },
                    { key: "remaining", label: "الباقي" },
                    { key: "status", label: "حالة الباقي" },
                    { key: "finalReceiver", label: "الاستلام النهائي (باقي)" },
                  ]}
                  filename="bookings_report"
                  title="تقرير حجوزات قاعة مذهلة"
                />"""

new_block = """                <ExportToolbar
                  data={bookingsFiltered.map(b => ({
                    date: b.event_date_hijri ? `${formatHijriDisplay(b.event_date_hijri)} هـ` : "—",
                    type: b.event_type || "—",
                    client: b.client_name || "—",
                    total: `${Number(b.total_amount || 0).toLocaleString()} ر.س`,
                    deposit: `${Number(b.deposit_amount || 0).toLocaleString()} ر.س`,
                    remaining: `${Number(b.remaining_amount || 0).toLocaleString()} ر.س`,
                    status: b.remaining_status || "—",
                    finalReceiver: b.remaining_receiver_final || "—",
                  }))}
                  columns={[
                    { key: "date", label: "التاريخ الهجري" },
                    { key: "type", label: "النوع" },
                    { key: "client", label: "العميل" },
                    { key: "total", label: "الإجمالي" },
                    { key: "deposit", label: "العربون" },
                    { key: "remaining", label: "الباقي" },
                    { key: "status", label: "حالة الباقي" },
                    { key: "finalReceiver", label: "الاستلام النهائي (باقي)" },
                  ]}
                  filename="bookings_report"
                  title="تقرير حجوزات قاعة مذهلة"
                  stats={[
                    { label: "عدد الحجوزات", value: bookingsFiltered.length, color: "#1B4D7A" },
                    { label: "إجمالي قيمة الحجوزات", value: `${bookingsFiltered.reduce((s, b) => s + Number(b.total_amount || 0), 0).toLocaleString()} ر.س`, color: "#1B4D7A" },
                    { label: "دخل إضافي", value: `${bookingsExtraIncomeTotal.toLocaleString()} ر.س`, color: "#148F77" },
                    { label: "الإجمالي الكلي", value: `${bookingsGrandTotal.toLocaleString()} ر.س`, color: "#B9770E" },
                    { label: `صافي الدخل (بعد خصم ${bookingsExpensePct}%)`, value: `${Math.round(bookingsFiltered.reduce((s, b) => s + Number(b.total_amount || 0), 0) * (1 - bookingsExpensePct / 100)).toLocaleString()} ر.س`, color: "#8E44AD" },
                  ]}
                />"""

total_changes = 0
for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    if old_block in content:
        content = content.replace(old_block, new_block, 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        total_changes += 1
        print(f"✅ تم تحديث {path}")
    else:
        print(f"⚠ لم يتم العثور على مكوّن ExportToolbar للحجوزات بـ {path} — تحقق يدوياً")

print(f"\nالإجمالي: تم تحديث {total_changes} من أصل {len(files)} ملفات")
