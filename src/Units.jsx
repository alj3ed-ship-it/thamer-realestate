import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const statusColor = {
  'مؤجرة': { background: '#dcfce7', color: '#166534' },
  'شاغرة': { background: '#fef9c3', color: '#854d0e' },
  'صيانة': { background: '#fee2e2', color: '#991b1b' }
}

export default function Units({ onBack }) {
  const [units, setUnits] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('الكل')
  const [filterProperty, setFilterProperty] = useState('الكل')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [u, p] = await Promise.all([
      supabase.from('units').select('*').order('created_at'),
      supabase.from('properties').select('id, name').order('name'),
    ])
    setUnits(u.data || [])
    setProperties(p.data || [])
    setLoading(false)
  }

  const filtered = units.filter(u => {
    const matchStatus = filterStatus === 'الكل' || u.status === filterStatus
    const matchProperty = filterProperty === 'الكل' || u.property_id === filterProperty
    return matchStatus && matchProperty
  })

  const total = units.length
  const rented = units.filter(u => u.status === 'مؤجرة').length
  const vacant = units.filter(u => u.status === 'شاغرة').length
  const maintenance = units.filter(u => u.status === 'صيانة').length

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>

      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>الوحدات</h1>
      <p style={{ color: '#666', margin: '0 0 20px' }}>جميع الوحدات في كل العقارات</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: total, bg: '#eff6ff', color: '#1B4D7A' },
          { label: 'مؤجرة', value: rented, bg: '#dcfce7', color: '#166534' },
          { label: 'شاغرة', value: vacant, bg: '#fef9c3', color: '#854d0e' },
          { label: 'صيانة', value: maintenance, bg: '#fee2e2', color: '#991b1b' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
            <div style={{ fontSize: 13, color: c.color, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
          <option value="الكل">كل العقارات</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
          <option value="الكل">كل الحالات</option>
          <option value="شاغرة">شاغرة</option>
          <option value="مؤجرة">مؤجرة</option>
          <option value="صيانة">صيانة</option>
        </select>
        <button onClick={fetchAll} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
          لا توجد وحدات
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
              {['العقار', 'رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات'].map(h => (
                <th key={h} style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const prop = properties.find(p => p.id === u.property_id)
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', color: '#1B4D7A', fontWeight: 600 }}>{prop?.name || '—'}</td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{u.unit_number}</td>
                  <td style={{ padding: '12px' }}>{u.unit_type || '—'}</td>
                  <td style={{ padding: '12px' }}>{u.floor ?? '—'}</td>
                  <td style={{ padding: '12px' }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ ...statusColor[u.status], padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                      {u.status || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{u.notes || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}