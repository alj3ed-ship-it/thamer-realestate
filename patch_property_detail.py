# -*- coding: utf-8 -*-
import re

FILE = "src/PropertyDetail.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Replace the stat cards block with premium card design
old_cards = '''      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: units.length, bg: '#eff6ff', color: '#1B4D7A' },
          { label: 'مؤجرة', value: units.filter(u => u.status === 'مؤجرة').length, bg: '#dcfce7', color: '#166534' },
          { label: 'شاغرة', value: units.filter(u => u.status === 'شاغرة').length, bg: '#fef9c3', color: '#854d0e' },
          { label: 'صيانة', value: units.filter(u => u.status === 'صيانة').length, bg: '#fee2e2', color: '#991b1b' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
            <div style={{ fontSize: 13, color: c.color, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>'''

new_cards = '''      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: units.length, color: '#1B4D7A', icon: '🏢' },
          { label: 'مؤجرة', value: units.filter(u => u.status === 'مؤجرة').length, color: '#166534', icon: '✅' },
          { label: 'شاغرة', value: units.filter(u => u.status === 'شاغرة').length, color: '#854d0e', icon: '🕓' },
          { label: 'صيانة', value: units.filter(u => u.status === 'صيانة').length, color: '#991b1b', icon: '🔧' },
        ].map(c => (
          <div key={c.label} style={{
            flex: '1 1 180px',
            background: '#fff',
            border: `1px solid ${c.color}33`,
            borderTop: `4px solid ${c.color}`,
            borderRadius: 14,
            padding: '18px 22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            textAlign: 'center',
            transition: 'transform .15s ease'
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
          </div>
        ))}
      </div>'''

if old_cards not in content:
    raise SystemExit("PATCH FAILED: cards block not found — file may have changed, aborting safely.")
content = content.replace(old_cards, new_cards)

# 2) Redesign table header + row styling (dark navy header, more spacing, zebra rows)
old_thead = '''          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                {(isReadOnly
                  ? ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات']
                  : ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات', '']
                ).map(h => (
                  <th key={h} style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1B4D7A' }}>{u.unit_number}</td>
                  <td style={{ padding: '12px' }}>{u.unit_type || '—'}</td>
                  <td style={{ padding: '12px' }}>{u.floor ?? '—'}</td>
                  <td style={{ padding: '12px' }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ ...statusColor[u.status], padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{u.status || '—'}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{u.notes || '—'}</td>'''

new_thead = '''          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                {(isReadOnly
                  ? ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات']
                  : ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات', '']
                ).map(h => (
                  <th key={h} style={{ padding: '14px 16px', color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1B4D7A' }}>{u.unit_number}</td>
                  <td style={{ padding: '14px 16px' }}>{u.unit_type || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{u.floor ?? '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ ...statusColor[u.status], padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{u.status || '—'}</span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 13 }}>{u.notes || '—'}</td>'''

if old_thead not in content:
    raise SystemExit("PATCH FAILED: table block not found — file may have changed, aborting safely.")
content = content.replace(old_thead, new_thead)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل PropertyDetail.jsx بنجاح")
