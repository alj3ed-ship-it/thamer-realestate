# -*- coding: utf-8 -*-
FILE = "src/VatReturns.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

old_cards = '''      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ background: '#F4ECF7', borderRadius: 10, padding: '10px 18px', minWidth: 180 }}>
          <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 3 }}>إجمالي الضريبة (كل الأرباع)</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#dc2626' }}>{grandTotalTax.toLocaleString()} ريال</div>
        </div>
        <div style={{ background: '#FDEDEC', borderRadius: 10, padding: '10px 18px', minWidth: 180 }}>
          <div style={{ fontSize: 12, color: '#e74c3c', marginBottom: 3 }}>غير مقدَّم بعد</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#e74c3c' }}>{unfiledTax.toLocaleString()} ريال</div>
        </div>
      </div>'''

new_cards = '''      <div style={{ display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 200px', background: '#fff', border: '1px solid #1B4D7A33', borderTop: '4px solid #1B4D7A',
          borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🧾</div>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>إجمالي الضريبة (كل الأرباع)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1B4D7A' }}>{grandTotalTax.toLocaleString()} ريال</div>
        </div>
        <div style={{
          flex: '1 1 200px', background: '#fff', border: '1px solid #dc262633', borderTop: '4px solid #dc2626',
          borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>غير مقدَّم بعد</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{unfiledTax.toLocaleString()} ريال</div>
        </div>
      </div>'''

if old_cards not in content:
    raise SystemExit("PATCH FAILED: cards block not found — aborting safely.")
content = content.replace(old_cards, new_cards)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل VatReturns.jsx بنجاح")
