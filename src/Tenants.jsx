import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { getUnitTypeColor } from './theme'
import ExportToolbar from './components/ExportToolbar'

function TenantDetail({ tenant, onBack }) {
  const [leases, setLeases] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [lea, pro] = await Promise.all([
        supabase.from('leases').select('*').eq('tenant_id', tenant.id),
        supabase.from('properties').select('id, name'),
      ])
      setLeases(lea.data || [])
      setProperties(pro.data || [])
      setLoading(false)
    }
    fetch()
  }, [tenant.id])

  function getPropName(pid) {
    return properties.find(p => p.id === pid)?.name || '—'
  }

  const exportData = leases.map((l) => ({
    property: getPropName(l.property_id),
    startDate: l.start_date || '—',
    endDate: l.end_date || '—',
    rent: l.rent_amount ? Number(l.rent_amount).toLocaleString() + ' ريال' : '—',
    status: l.status || '—',
  }))

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للمستأجرين
      </button>
      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>{tenant.name}</h1>
      <div style={{ display: 'flex', gap: 24, color: '#6b7280', marginBottom: 28, flexWrap: 'wrap' }}>
        {tenant.phone && <span>📱 {tenant.phone}</span>}
        {tenant.national_id && <span>🪪 {tenant.national_id}</span>}
        {tenant.email && <span>✉️ {tenant.email}</span>}
        {tenant.note && <span>📝 {tenant.note}</span>}
      </div>
      <h3 style={{ color: '#1B4D7A', marginBottom: 12 }}>العقود ({leases.length})</h3>
      {loading && <p>جاري التحميل...</p>}
      {!loading && leases.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
          لا توجد عقود لهذا المستأجر
        </div>
      )}
      {!loading && leases.length > 0 && (
        <div id="tenant-detail-table">
          <ExportToolbar
            data={exportData}
            columns={[
              { key: 'property', label: 'العقار' },
              { key: 'startDate', label: 'من' },
              { key: 'endDate', label: 'إلى' },
              { key: 'rent', label: 'الإيجار' },
              { key: 'status', label: 'الحالة' },
            ]}
            filename={`tenant_${tenant.name || 'report'}`}
            title={`تقرير عقود ${tenant.name || ''}`}
          />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                {['العقار', 'من', 'إلى', 'الإيجار', 'الحالة'].map(h => (
                  <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leases.map((l, idx) => (
                <tr key={l.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1B4D7A' }}>{getPropName(l.property_id)}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{l.start_date || '—'}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{l.end_date || '—'}</td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + ' ريال' : '—'}</td>
                  <td style={{ padding: '12px' }}>{l.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Tenants({ onBack }) {
  const [tenants, setTenants] = useState([])
  const [properties, setProperties] = useState([])
  const [leases, setLeases] = useState([])
  const [units, setUnits] = useState([])
  const [leaseUnits, setLeaseUnits] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [filterProperty, setFilterProperty] = useState('الكل')
  const [filterTenantId, setFilterTenantId] = useState('الكل')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formPropertyId, setFormPropertyId] = useState('')
  const [formError, setFormError] = useState('')

  async function fetchAll() {
    setStatus('loading')
    setErrorMsg('')
    const [ten, pro, lea, uni, lu] = await Promise.all([
      supabase.from('tenants').select('*'),
      supabase.from('properties').select('id, name, priority').order('priority'),
      supabase.from('leases').select('id, tenant_id, unit_id, property_id'),
      supabase.from('units').select('id, unit_number, unit_type'),
      supabase.from('lease_units').select('lease_id, unit_id'),
    ])
    if (ten.error) { setErrorMsg(ten.error.message); setStatus('error'); return }
    setTenants(ten.data || [])
    setProperties(pro.data || [])
    setLeases(lea.data || [])
    setUnits(uni.data || [])
    setLeaseUnits(lu.data || [])
    setStatus('success')
  }

  useEffect(() => { fetchAll() }, [])

  if (selectedTenant) return <TenantDetail tenant={selectedTenant} onBack={() => setSelectedTenant(null)} />

  function openAddForm() {
    setEditingId(null); setFormName(''); setFormPhone(''); setFormNote(''); setFormPropertyId(''); setFormError(''); setShowForm(true)
  }

  function openEditForm(tenant) {
    setEditingId(tenant.id); setFormName(tenant.name || ''); setFormPhone(tenant.phone || '')
    setFormNote(tenant.note || ''); setFormPropertyId(tenant.property_id || ''); setFormError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!formName.trim()) { setFormError('اسم المستأجر مطلوب'); return }
    setSaving(true); setFormError('')
    const payload = { name: formName.trim(), phone: formPhone.trim() || null, note: formNote.trim() || null, property_id: formPropertyId || null }
    let error
    if (editingId) { const res = await supabase.from('tenants').update(payload).eq('id', editingId); error = res.error }
    else { const res = await supabase.from('tenants').insert([payload]); error = res.error }
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false); fetchAll()
  }

  async function handleDelete(tenant) {
    if (!window.confirm(`هل أنت متأكد من حذف "${tenant.name}"؟`)) return
    setDeletingId(tenant.id)
    const { error } = await supabase.from('tenants').delete().eq('id', tenant.id)
    setDeletingId(null)
    if (error) { alert('فشل الحذف: ' + error.message); return }
    fetchAll()
  }

  // إصلاح: عرض نوع الوحدة (محل/شقة/ورشة) مع الرقم لتفادي اللبس بين وحدات بنفس الرقم من أنواع مختلفة
  function getAllUnitEntries(tenantId) {
    const tenantLeases = leases.filter(l => l.tenant_id === tenantId)
    if (!tenantLeases.length) return []
    const leaseIds = tenantLeases.map(l => l.id)
    const unitIds = leaseUnits
      .filter(lu => leaseIds.includes(lu.lease_id))
      .map(lu => lu.unit_id)
    tenantLeases.forEach(l => { if (l.unit_id && !unitIds.includes(l.unit_id)) unitIds.push(l.unit_id) })
    const uniqueIds = [...new Set(unitIds)]
    const entries = uniqueIds.map(uid => {
      const unit = units.find(u => u.id === uid)
      if (!unit) return null
      return { type: unit.unit_type || '', number: unit.unit_number }
    }).filter(Boolean)
    const typeOrder = { 'محل': 1, 'شقة': 2, 'ورشة': 3, 'مستودع': 4, 'غرفة': 5 }
    entries.sort((a, b) => {
      const ta = typeOrder[a.type] || 9
      const tb = typeOrder[b.type] || 9
      if (ta !== tb) return ta - tb
      return Number(a.number) - Number(b.number)
    })
    return entries
  }

  function getAllUnitNumbers(tenantId) {
    const entries = getAllUnitEntries(tenantId)
    if (!entries.length) return { min: 9999, display: '—', sortType: 9 }
    // entries معاد ترتيبها مسبقاً حسب typeOrder ثم الرقم (محل أولاً)
    // فنستخدم أول عنصر لتحديد نوع وترتيب المستأجر بشكل عام (محل يسبق شقة/ورشة/مستودع)
    const typeOrder = { 'محل': 1, 'شقة': 2, 'ورشة': 3, 'مستودع': 4, 'غرفة': 5 }
    const primary = entries[0]
    const sortType = typeOrder[primary.type] || 9
    const min = Number(primary.number) || 9999
    const display = entries.map(e => e.type ? `${e.type} ${e.number}` : e.number).join('، ')
    return { min, display, sortType }
  }

  function getTenantPropertyIds(tenantId) {
    const ids = new Set()
    leases.filter(l => l.tenant_id === tenantId).forEach(l => { if (l.property_id) ids.add(l.property_id) })
    return ids
  }

  function tenantBelongsToProperty(tenant, propertyId) {
    if (tenant.property_id === propertyId) return true
    return getTenantPropertyIds(tenant.id).has(propertyId)
  }

  function getTenantPropertyDisplay(tenant) {
    const ids = getTenantPropertyIds(tenant.id)
    if (tenant.property_id) ids.add(tenant.property_id)
    if (ids.size === 0) return '—'
    return [...ids].map(pid => properties.find(p => p.id === pid)?.name).filter(Boolean).join('، ') || '—'
  }

  // ترتيب العقارات: يعتمد على عمود priority بجدول properties (نفس ترتيب صفحة العقود:
  // عمارة سلمان، عمارة إبراهيم، عبدالله الكبيرة، عبدالله الصغيرة، ثم باقي العقارات)
  function getTenantMinPriority(tenant) {
    const ids = getTenantPropertyIds(tenant.id)
    if (tenant.property_id) ids.add(tenant.property_id)
    if (ids.size === 0) return 999
    const priorities = [...ids].map(pid => properties.find(p => p.id === pid)?.priority ?? 999)
    return Math.min(...priorities)
  }

  // قائمة المستأجرين مرتبة أبجدياً لعرضها بالقائمة المنسدلة
  const sortedTenantsForDropdown = [...tenants].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))

  const filtered = (filterProperty === 'الكل'
    ? tenants
    : tenants.filter(t => tenantBelongsToProperty(t, filterProperty))
  )
    .filter(t => filterTenantId === 'الكل' || t.id === filterTenantId)
    .slice()
    .sort((a, b) => {
      // 1) حسب ترتيب العقار (priority)
      const pa = getTenantMinPriority(a)
      const pb = getTenantMinPriority(b)
      if (pa !== pb) return pa - pb
      // 2) داخل نفس العقار: المحلات أولاً بترتيب تصاعدي، ثم الشقق/الورش/المستودعات كمجموعة أخيرة
      const ua = getAllUnitNumbers(a.id)
      const ub = getAllUnitNumbers(b.id)
      if (ua.sortType !== ub.sortType) return ua.sortType - ub.sortType
      return ua.min - ub.min
    })

  function unitBadges(tenantId) {
    const entries = getAllUnitEntries(tenantId)
    if (entries.length === 0) return <span style={{ color: '#9ca3af' }}>—</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {entries.map((e, idx) => {
          const c = getUnitTypeColor(e.type)
          return (
            <span key={idx} style={{
              background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
            }}>
              {e.type} {e.number}
            </span>
          )
        })}
      </div>
    )
  }

  const exportData = filtered.map((t) => ({
    name: t.name || '—',
    property: getTenantPropertyDisplay(t),
    units: getAllUnitNumbers(t.id).display,
    phone: t.phone || '—',
    notes: t.note || '—',
  }))

  const exportStats = [
    { label: 'عدد المستأجرين', value: filtered.length, color: '#1B4D7A' },
  ]

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px' }}>المستأجرون</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>إدارة قائمة المستأجرين</p>

      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة مستأجر جديد
        </button>
        <button onClick={fetchAll} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
        <select value={filterTenantId} onChange={e => setFilterTenantId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif', minWidth: 200 }}>
          <option value="الكل">كل المستأجرين</option>
          {sortedTenantsForDropdown.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif', marginRight: 'auto' }}>
          <option value="الكل">كل العقارات</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}
      {status === 'error' && <div style={{ background: '#fee', padding: 15, borderRadius: 8, color: '#c00' }}>فشل تحميل المستأجرين: {errorMsg}</div>}
      {status === 'success' && filtered.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا يوجد مستأجرون.</div>
      )}

      {status === 'success' && filtered.length > 0 && (
        <div id="tenants-table">
          <ExportToolbar
            data={exportData}
            columns={[
              { key: 'name', label: 'المستأجر' },
              { key: 'property', label: 'العقار' },
              { key: 'units', label: 'الوحدات' },
              { key: 'phone', label: 'الجوال' },
              { key: 'notes', label: 'ملاحظات' },
            ]}
            filename="tenants_report"
            title="تقرير المستأجرين"
            stats={exportStats}
          />

          <div style={{ overflowX: 'auto', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' }}>
              <thead>
                <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                  {['المستأجر', 'العقار', 'الوحدات', 'الجوال', 'ملاحظات', ''].map(h => (
                    <th key={h} style={{ padding: '14px 12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr key={t.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <span onClick={() => setSelectedTenant(t)}
                        style={{ cursor: 'pointer', color: '#1B4D7A', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                        {t.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280', fontWeight: 500 }}>{getTenantPropertyDisplay(t)}</td>
                    <td style={{ padding: '12px' }}>{unitBadges(t.id)}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{t.phone || '—'}</td>
                    <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{t.note || '—'}</td>
                    <td className="no-print" style={{ padding: '12px' }}>
                      <button onClick={() => openEditForm(t)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                      <button onClick={() => handleDelete(t)} disabled={deletingId === t.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                        {deletingId === t.id ? '...' : 'حذف'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: 12, width: 420, maxWidth: '90%', direction: 'rtl' }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'تعديل مستأجر' : 'إضافة مستأجر جديد'}</h2>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>الاسم</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }} placeholder="اسم المستأجر" />
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>الجوال</label>
            <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }} placeholder="05xxxxxxxx" />
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>العقار</label>
            <select value={formPropertyId} onChange={e => setFormPropertyId(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}>
              <option value="">اختر العقار (اختياري)</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>ملاحظات (اختياري)</label>
            <textarea value={formNote} onChange={e => setFormNote(e.target.value)} rows={3}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', resize: 'vertical', fontSize: 14 }} placeholder="أي معلومة إضافية..." />
            {formError && <div style={{ color: '#c00', marginBottom: 15, fontSize: 14 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: '#1B4D7A', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tenants