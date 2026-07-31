# -*- coding: utf-8 -*-
FILE = "src/Units.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Premium stat cards (distinguish taxable from maintenance color)
old_cards = '''      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: total, bg: '#eff6ff', color: '#1B4D7A' },
          { label: 'مؤجرة', value: rented, bg: '#dcfce7', color: '#166534' },
          { label: 'شاغرة', value: vacant, bg: '#fef9c3', color: '#854d0e' },
          { label: 'صيانة', value: maintenance, bg: '#fee2e2', color: '#991b1b' },
          { label: 'خاضعة للضريبة', value: taxableCount, bg: '#fee2e2', color: '#b91c1c' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
            <div style={{ fontSize: 13, color: c.color, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>'''

new_cards = '''      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: total, color: '#1B4D7A', icon: '🏢' },
          { label: 'مؤجرة', value: rented, color: '#166534', icon: '✅' },
          { label: 'شاغرة', value: vacant, color: '#854d0e', icon: '🕓' },
          { label: 'صيانة', value: maintenance, color: '#991b1b', icon: '🔧' },
          { label: 'خاضعة للضريبة', value: taxableCount, color: '#7c3aed', icon: '🧾' },
        ].map(c => (
          <div key={c.label} style={{
            flex: '1 1 170px',
            background: '#fff',
            border: `1px solid ${c.color}33`,
            borderTop: `4px solid ${c.color}`,
            borderRadius: 14,
            padding: '18px 22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
          </div>
        ))}
      </div>'''

if old_cards not in content:
    raise SystemExit("PATCH FAILED: cards block not found — aborting safely.")
content = content.replace(old_cards, new_cards)

# 2) Cleaner VAT badge/select — custom arrow, more spacing, no cramped look
old_vat_select = '''                      <td style={{ padding: '8px 12px' }}>
                        <select
                          value={vatValue}
                          disabled={isReadOnly || updatingId === u.id}
                          onChange={e => handleVatChange(u.id, e.target.value)}
                          style={{
                            background: vatInfo.bg, color: vatInfo.color, border: `1px solid ${vatInfo.border}`,
                            padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                            fontFamily: 'Cairo, sans-serif', cursor: 'pointer'
                          }}>
                          {VAT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>'''

new_vat_select = '''                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={vatValue}
                          disabled={isReadOnly || updatingId === u.id}
                          onChange={e => handleVatChange(u.id, e.target.value)}
                          style={{
                            background: vatInfo.bg, color: vatInfo.color, border: `1.5px solid ${vatInfo.border}`,
                            padding: '6px 28px 6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
                            fontFamily: 'Cairo, sans-serif', cursor: isReadOnly ? 'default' : 'pointer',
                            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='${encodeURIComponent(vatInfo.color)}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'left 10px center',
                            minWidth: 90, textAlign: 'center', textAlignLast: 'center',
                          }}>
                          {VAT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>'''

if old_vat_select not in content:
    raise SystemExit("PATCH FAILED: vat select block not found — aborting safely.")
content = content.replace(old_vat_select, new_vat_select)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل Units.jsx بنجاح")
