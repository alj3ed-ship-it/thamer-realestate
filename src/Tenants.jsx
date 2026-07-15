import { useState, useEffect, useRef } from 'react'
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
  const [filterTenantIds, setFilterTenantIds] = useState([])
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const [tenantSearchText, setTenantSearchText] = useState('')
  const tenantBoxRef = useRef(null)
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (tenantBoxRef.current && !tenantBoxRef.current.contains(e.target)) {
        setShowTenantDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  function getTenantMinPriority(tenant) {
    const ids = getTenantPropertyIds(tenant.id)
    if (tenant.property_id) ids.add(tenant.property_id)
    if (ids.size === 0) return 999
    const priorities = [...ids].map(pid => properties.find(p => p.id === pid)?.priority ?? 999)
    return Math.min(...priorities)
  }

  const availableTenants = (filterProperty === 'الكل'
    ? tenants
    : tenants.filter(t => tenantBelongsToProperty(t, filterProperty))
  )
  const sortedTenantsForDropdown = [...availableTenants].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
  const filteredTenantOptions = sortedTenantsForDropdown.filter(t => (t.name || '').toLowerCase().includes(tenantSearchText.toLowerCase()))

  useEffect(() => {
    if (filterTenantIds.length > 0) {
      const availableIds = new Set(availableTenants.map(t => t.id))
      setFilterTenantIds(prev => prev.filter(id => availableIds.has(id)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProperty])

  const filtered = (filterProperty === 'الكل'
    ? tenants
    : tenants.filter(t => tenantBelongsToProperty(t, filterProperty))
  )
    .filter(t => filterTenantIds.length === 0 || filterTenantIds.includes(t.id))
    .slice()
    .sort((a, b) => {
      const pa = getTenantMinPriority(a)
      const pb = getTenantMinPriority(b)
      if (pa !== pb) return pa - pb
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

        <div ref={tenantBoxRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowTenantDropdown(!showTenantDropdown)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'Cairo, sans-serif', minWidth: 200, background: '#fff', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>
              {filterTenantIds.length === 0
                ? 'كل المستأجرين'
                : filterTenantIds.length === 1
                  ? (sortedTenantsForDropdown.find(t => t.id === filterTenantIds[0])?.name || 'مستأجر واحد')
                  : `${filterTenantIds.length} مستأجرين محددين`}
            </span>
            <span style={{ fontSize: 10, color: '#999' }}>▾</span>
          </button>

          {showTenantDropdown && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, minWidth: 240, maxHeight: 320, overflowY: 'auto' }}>
              <input
                type="text"
                placeholder="اكتب اسم المستأجر..."
                value={tenantSearchText}
                onChange={(e) => setTenantSearchText(e.target.value)}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'Cairo, sans-serif', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                <button type="button" onClick={() => setFilterTenantIds(filteredTenantOptions.map(t => t.id))}
                  style={{ fontSize: 12, color: '#1B4D7A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  تحديد الكل
                </button>
                <button type="button" onClick={() => setFilterTenantIds([])}
                  style={{ fontSize: 12, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  إلغاء الكل
                </button>
              </div>
              {filteredTenantOptions.length === 0 && (
                <div style={{ fontSize: 13, color: '#999', padding: '6px 4px' }}>لا يوجد مستأجر بهذا الاسم</div>
              )}
              {filteredTenantOptions.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterTenantIds.includes(t.id)}
                    onChange={() => {
                      setFilterTenantIds(prev =>
                        prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                      )
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          )}
        </div>

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