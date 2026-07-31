# -*- coding: utf-8 -*-
FILE = "src/Payments.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Widen the page container
old_container = '''    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>'''
new_container = '''    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px 24px', maxWidth: '1500px', margin: '0 auto' }}>'''
if old_container not in content:
    raise SystemExit("PATCH FAILED: container not found — aborting safely.")
content = content.replace(old_container, new_container)

# 2) Table wrapper: rounded corners + shadow, consistent with other pages
old_table_open = '''          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                  {(isReadOnly
                    ? ['المستأجر', 'العقار', 'النشاط', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات']
                    : ['المستأجر', 'العقار', 'النشاط', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات', '']
                  ).map(h => (
                    <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>'''

new_table_open = '''          <div style={{ overflowX: 'auto', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                  {(isReadOnly
                    ? ['المستأجر', 'العقار', 'النشاط', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات']
                    : ['المستأجر', 'العقار', 'النشاط', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات', '']
                  ).map(h => (
                    <th key={h} style={{ padding: '14px 18px', color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>'''

if old_table_open not in content:
    raise SystemExit("PATCH FAILED: table header not found — aborting safely.")
content = content.replace(old_table_open, new_table_open)

# 3) Row cells: more padding + prevent installment/unit cramping
old_row = '''                    <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#1B4D7A' }}>{getTenantName(p.lease_id)}</td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{getPropertyName(p.lease_id)}</td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: 13 }}>{getTenantActivity(p.lease_id)}</td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: 13 }}>{getUnitNumbers(p.lease_id)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ background: '#eff6ff', color: '#1B4D7A', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                          {total ? `${index} / ${total}` : `${index}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{amountCell(p)}</td>
                      <td style={{ padding: '12px' }}>{statusBadge(p)}</td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>
                        <div style={{ fontWeight: 600 }}>{hijriText ? hijriText + ' هـ' : '—'}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.payment_date || (isEstimated ? 'متوقع' : '—')}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{p.payment_method || '—'}</td>
                      <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{p.notes || '—'}</td>'''

new_row = '''                    <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px 18px', fontWeight: 700, color: '#1B4D7A', whiteSpace: 'nowrap' }}>{getTenantName(p.lease_id)}</td>
                      <td style={{ padding: '16px 18px', color: '#6b7280', whiteSpace: 'nowrap' }}>{getPropertyName(p.lease_id)}</td>
                      <td style={{ padding: '16px 18px', color: '#6b7280', fontSize: 13 }}>{getTenantActivity(p.lease_id)}</td>
                      <td style={{ padding: '16px 18px', color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}>{getUnitNumbers(p.lease_id)}</td>
                      <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                        <span style={{ background: '#eff6ff', color: '#1B4D7A', padding: '4px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {total ? `${index} / ${total}` : `${index}`}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', minWidth: 180 }}>{amountCell(p)}</td>
                      <td style={{ padding: '16px 18px' }}>{statusBadge(p)}</td>
                      <td style={{ padding: '16px 18px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{hijriText ? hijriText + ' هـ' : '—'}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.payment_date || (isEstimated ? 'متوقع' : '—')}</div>
                      </td>
                      <td style={{ padding: '16px 18px', color: '#6b7280', whiteSpace: 'nowrap' }}>{p.payment_method || '—'}</td>
                      <td style={{ padding: '16px 18px', color: '#9ca3af', fontSize: 13 }}>{p.notes || '—'}</td>'''

if old_row not in content:
    raise SystemExit("PATCH FAILED: row cells not found — aborting safely.")
content = content.replace(old_row, new_row)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل Payments.jsx بنجاح")
