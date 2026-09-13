import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'

const INVOICE_TYPES = ['ضريبية', 'ضريبية مبسطة']
const VAT_RATE = 15

function emptyItem() {
  return { key: Math.random().toString(36).slice(2), description: '', quantity: '1', unit_price: '' }
}

function emptyForm() {
  return {
    organization_id: '',
    invoice_type: 'ضريبية مبسطة',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    customer_name: '',
    customer_vat_number: '',
    customer_address: '',
    items: [emptyItem()],
  }
}

function lineAmounts(item) {
  const qty = Number(item.quantity) || 0
  const price = Number(item.unit_price) || 0
  const lineTotal = qty * price
  const vatAmount = lineTotal * (VAT_RATE / 100)
  return { lineTotal, vatAmount, gross: lineTotal + vatAmount }
}

function Invoices({ onBack }) {
  const isReadOnly = useReadOnly()
  const [organizations, setOrganizations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [status, setStatus] = useState('loading')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editingInvoiceId, setEditingInvoiceId] = useState(null)
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState('')
  const [zatcaChecks, setZatcaChecks] = useState({})

  async function fetchAll() {
    setStatus('loading')
    const [org, inv] = await Promise.all([
      supabase.from('organizations').select('id, name, vat_number, cr_number, address').order('name'),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    setOrganizations(org.data || [])
    setInvoices(inv.data || [])
    setForm(f => ({ ...f, organization_id: f.organization_id || org.data?.[0]?.id || '' }))
    setStatus('success')
  }

  useEffect(() => { fetchAll() }, [])

  function updateItem(key, field, value) {
    setForm(f => ({
      ...f,
      items: f.items.map(it => it.key === key ? { ...it, [field]: value } : it)
    }))
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))
  }

  function removeItem(key) {
    setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter(it => it.key !== key) : f.items }))
  }

  const subtotal = form.items.reduce((s, it) => s + lineAmounts(it).lineTotal, 0)
  const vatTotal = form.items.reduce((s, it) => s + lineAmounts(it).vatAmount, 0)
  const grandTotal = subtotal + vatTotal

  function generateInvoiceNumber() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `DRAFT-${y}${m}${d}-${rand}`
  }

  async function handleSaveDraft() {
    setFormError(''); setFormSuccess('')
    if (!form.customer_name.trim()) { setFormError('يرجى إدخال اسم العميل'); return }
    const validItems = form.items.filter(it => it.description.trim() && Number(it.unit_price) > 0)
    if (validItems.length === 0) { setFormError('يرجى إضافة بند واحد على الأقل ببيان وسعر صحيحين'); return }

    setSaving(true)
    const invoicePayload = {
      organization_id: form.organization_id || null,
      invoice_number: generateInvoiceNumber(),
      invoice_type: form.invoice_type,
      status: 'draft',
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      customer_name: form.customer_name || null,
      customer_vat_number: form.customer_vat_number || null,
      customer_address: form.customer_address || null,
      subtotal: Math.round(subtotal * 100) / 100,
      vat_amount: Math.round(vatTotal * 100) / 100,
      total_amount: Math.round(grandTotal * 100) / 100,
    }

    const { data: inserted, error: invError } = await supabase.from('invoices').insert([invoicePayload]).select('id')
    if (invError) { setSaving(false); setFormError(invError.message); return }
    const invoiceId = inserted?.[0]?.id

    const itemRows = validItems.map((it, idx) => {
      const { lineTotal, vatAmount } = lineAmounts(it)
      return {
        invoice_id: invoiceId,
        description: it.description,
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        vat_rate: VAT_RATE,
        vat_amount: Math.round(vatAmount * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100,
        sort_order: idx,
      }
    })
    const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows)
    setSaving(false)
    if (itemsError) { setFormError(itemsError.message); return }

    setFormSuccess('تم حفظ الفاتورة كمسودة بنجاح')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    fetchAll()
  }

  async function handleUpdateDraft() {
    setFormError(''); setFormSuccess('')
    if (!editingInvoiceId) return
    if (!form.customer_name.trim()) { setFormError('يرجى إدخال اسم العميل'); return }
    const validItems = form.items.filter(it => it.description.trim() && Number(it.unit_price) > 0)
    if (validItems.length === 0) { setFormError('يرجى إضافة بند واحد على الأقل ببيان وسعر صحيحين'); return }

    setSaving(true)
    const invoicePayload = {
      organization_id: form.organization_id || null,
      invoice_type: form.invoice_type,
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      customer_name: form.customer_name || null,
      customer_vat_number: form.customer_vat_number || null,
      customer_address: form.customer_address || null,
      subtotal: Math.round(subtotal * 100) / 100,
      vat_amount: Math.round(vatTotal * 100) / 100,
      total_amount: Math.round(grandTotal * 100) / 100,
    }

    const { error: invError } = await supabase.from('invoices').update(invoicePayload).eq('id', editingInvoiceId)
    if (invError) { setSaving(false); setFormError(invError.message); return }

    const { error: delError } = await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoiceId)
    if (delError) { setSaving(false); setFormError(delError.message); return }

    const itemRows = validItems.map((it, idx) => {
      const { lineTotal, vatAmount } = lineAmounts(it)
      return {
        invoice_id: editingInvoiceId,
        description: it.description,
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        vat_rate: VAT_RATE,
        vat_amount: Math.round(vatAmount * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100,
        sort_order: idx,
      }
    })
    const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows)
    setSaving(false)
    if (itemsError) { setFormError(itemsError.message); return }

    setFormSuccess('تم تحديث المسودة بنجاح')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    fetchAll()
  }

  async function handleEditDraft(inv) {
    if (inv.status !== 'draft' || isReadOnly) return
    setFormError(''); setFormSuccess('')
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')
    if (error) { setFormError(error.message); return }

    setForm({
      organization_id: inv.organization_id || '',
      invoice_type: inv.invoice_type || 'ضريبية مبسطة',
      issue_date: inv.issue_date || new Date().toISOString().slice(0, 10),
      due_date: inv.due_date || '',
      customer_name: inv.customer_name || '',
      customer_vat_number: inv.customer_vat_number || '',
      customer_address: inv.customer_address || '',
      items: (items && items.length > 0)
        ? items.map(it => ({
            key: Math.random().toString(36).slice(2),
            description: it.description || '',
            quantity: String(it.quantity ?? '1'),
            unit_price: String(it.unit_price ?? ''),
          }))
        : [emptyItem()],
    })
    setEditingInvoiceId(inv.id)
    setEditingInvoiceNumber(inv.invoice_number)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
  }

  async function handleZatcaCheck(inv) {
    setZatcaChecks(z => ({ ...z, [inv.id]: { loading: true, error: '', result: null } }))
    try {
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', inv.id)
        .order('sort_order')
      if (itemsError) throw new Error(itemsError.message)
      if (!items || items.length === 0) throw new Error('لا توجد بنود بهذه الفاتورة')

      const organization = organizations.find(o => o.id === inv.organization_id) || null

      const response = await fetch('/api/zatca-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization,
          invoice: {
            invoice_number: inv.invoice_number,
            issue_date: inv.issue_date,
            customer_name: inv.customer_name,
          },
          items: items.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            vat_rate: it.vat_rate,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'فشل فحص الامتثال')

      const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 220 })

      setZatcaChecks(z => ({
        ...z,
        [inv.id]: { loading: false, error: '', result: { ...data, qrDataUrl } },
      }))

      await supabase.from('invoices').update({
        qr_code: data.qr,
        invoice_hash: data.invoice_hash,
        compliance_status: data.compliance.status,
      }).eq('id', inv.id)
      fetchAll()
    } catch (err) {
      setZatcaChecks(z => ({ ...z, [inv.id]: { loading: false, error: err.message, result: null } }))
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }
  const labelStyle = { fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }

  function statusBadge(s) {
    const map = {
      draft: { bg: '#FEF9E7', color: '#b7950b', label: 'مسودة' },
      pending_review: { bg: '#EAF4FB', color: '#2E86C1', label: 'قيد المراجعة' },
      submitted: { bg: '#EAFAF1', color: '#27ae60', label: 'مُرسلة' },
      failed: { bg: '#FDEDEC', color: '#e74c3c', label: 'فشلت' },
    }
    const cfg = map[s] || { bg: '#f3f4f6', color: '#6b7280', label: s || '—' }
    return <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px' }}>الفواتير الإلكترونية</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>إنشاء فاتورة ضريبية جديدة وحفظها كمسودة</p>

      {status === 'loading' && <p>جاري التحميل...</p>}

      {status === 'success' && (
        <>
          {!isReadOnly && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 28, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#1B4D7A' }}>
                {editingInvoiceId ? `تعديل مسودة: ${editingInvoiceNumber}` : 'فاتورة جديدة'}
              </h3>
              {editingInvoiceId && (
                <button type="button" onClick={handleNewInvoice}
                  style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontWeight: 700 }}>
                  + فاتورة جديدة
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>المنشأة</label>
                <select value={form.organization_id} onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))} style={inputStyle}>
                  <option value="">— اختر المنشأة —</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>نوع الفاتورة</label>
                <select value={form.invoice_type} onChange={e => setForm(f => ({ ...f, invoice_type: e.target.value }))} style={inputStyle}>
                  {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>تاريخ الإصدار</label>
                <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>تاريخ الاستحقاق (اختياري)</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <h3 style={{ fontSize: 15, color: '#1B4D7A', margin: '0 0 10px' }}>بيانات العميل</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={labelStyle}>اسم العميل *</label>
                <input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>الرقم الضريبي للعميل</label>
                <input type="text" value={form.customer_vat_number} onChange={e => setForm(f => ({ ...f, customer_vat_number: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>عنوان العميل</label>
                <input type="text" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <h3 style={{ fontSize: 15, color: '#1B4D7A', margin: '0 0 10px' }}>بنود الفاتورة</h3>
            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280' }}>البيان</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 90 }}>الكمية</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 130 }}>سعر الوحدة</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 120 }}>الإجمالي قبل الضريبة</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 110 }}>الضريبة 15%</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 120 }}>الإجمالي شامل</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map(it => {
                    const { lineTotal, vatAmount, gross } = lineAmounts(it)
                    return (
                      <tr key={it.key} style={{ borderTop: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="text" value={it.description} onChange={e => updateItem(it.key, 'description', e.target.value)} style={inputStyle} placeholder="وصف البند" />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0" value={it.quantity} onChange={e => updateItem(it.key, 'quantity', e.target.value)} style={inputStyle} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0" value={it.unit_price} onChange={e => updateItem(it.key, 'unit_price', e.target.value)} style={inputStyle} />
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{lineTotal.toLocaleString()} ريال</td>
                        <td style={{ padding: '6px 8px', color: '#8e44ad', fontWeight: 700 }}>{vatAmount.toLocaleString()} ريال</td>
                        <td style={{ padding: '6px 8px', color: '#27ae60', fontWeight: 700 }}>{gross.toLocaleString()} ريال</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeItem(it.key)} title="حذف البند"
                            style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16 }}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <button type="button" onClick={addItem}
              style={{ padding: '8px 16px', marginBottom: 20, cursor: 'pointer', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontWeight: 700 }}>
              + إضافة بند
            </button>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ background: '#EBF5FB', padding: '10px 18px', borderRadius: 8, fontWeight: 700, color: '#1B4D7A' }}>
                الإجمالي قبل الضريبة: {subtotal.toLocaleString()} ريال
              </div>
              <div style={{ background: '#F4ECF7', padding: '10px 18px', borderRadius: 8, fontWeight: 700, color: '#8e44ad' }}>
                ضريبة القيمة المضافة (15%): {vatTotal.toLocaleString()} ريال
              </div>
              <div style={{ background: '#EAFAF1', padding: '10px 18px', borderRadius: 8, fontWeight: 700, color: '#27ae60' }}>
                الإجمالي شامل الضريبة: {grandTotal.toLocaleString()} ريال
              </div>
            </div>

            {formError && <p style={{ color: '#e74c3c', fontWeight: 700 }}>{formError}</p>}
            {formSuccess && <p style={{ color: '#27ae60', fontWeight: 700 }}>{formSuccess}</p>}

            <button onClick={editingInvoiceId ? handleUpdateDraft : handleSaveDraft} disabled={saving}
              style={{ padding: '10px 24px', cursor: saving ? 'default' : 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'جاري الحفظ...' : (editingInvoiceId ? '💾 تحديث المسودة' : '💾 حفظ كمسودة')}
            </button>
          </div>
          )}

          <h2 style={{ fontSize: 18, color: '#1B4D7A', margin: '0 0 12px' }}>آخر 20 فاتورة محفوظة</h2>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>رقم الفاتورة</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>النوع</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>العميل</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>تاريخ الإصدار</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>الإجمالي</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>الحالة</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>فحص ZATCA (تجريبي)</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>لا توجد فواتير محفوظة بعد</td></tr>
                )}
                {invoices.map(inv => (
                  <tr key={inv.id}
                    onClick={() => handleEditDraft(inv)}
                    title={inv.status === 'draft' && !isReadOnly ? 'اضغط لتعديل هذه المسودة' : undefined}
                    style={{
                      borderTop: '1px solid #f0f0f0',
                      background: editingInvoiceId === inv.id ? '#EBF5FB' : 'transparent',
                      cursor: inv.status === 'draft' && !isReadOnly ? 'pointer' : 'default',
                    }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{inv.invoice_number}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.invoice_type}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.customer_name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.issue_date || '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1B4D7A' }}>{Number(inv.total_amount || 0).toLocaleString()} ريال</td>
                    <td style={{ padding: '10px 12px' }}>{statusBadge(inv.status)}</td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      {inv.status === 'draft' && !isReadOnly ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                          <button
                            type="button"
                            onClick={() => handleZatcaCheck(inv)}
                            disabled={zatcaChecks[inv.id]?.loading}
                            style={{
                              padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                              cursor: zatcaChecks[inv.id]?.loading ? 'default' : 'pointer',
                              borderRadius: 6, border: '1px solid #1B4D7A', background: '#fff',
                              color: '#1B4D7A', fontWeight: 700,
                              opacity: zatcaChecks[inv.id]?.loading ? 0.6 : 1,
                            }}>
                            {zatcaChecks[inv.id]?.loading ? 'جاري الفحص...' : '🔍 فحص/توليد QR (تجريبي)'}
                          </button>

                          {zatcaChecks[inv.id]?.error && (
                            <span style={{ color: '#e74c3c', fontSize: 12, maxWidth: 240 }}>{zatcaChecks[inv.id].error}</span>
                          )}

                          {zatcaChecks[inv.id]?.result && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f9fafb', padding: 8, borderRadius: 8 }}>
                              <img
                                src={zatcaChecks[inv.id].result.qrDataUrl}
                                alt="ZATCA QR"
                                width={72}
                                height={72}
                                style={{ borderRadius: 4, border: '1px solid #e5e7eb', flexShrink: 0 }}
                              />
                              <div style={{ fontSize: 12, maxWidth: 220 }}>
                                <span style={{
                                  background: zatcaChecks[inv.id].result.compliance.passed ? '#EAFAF1' : '#FDEDEC',
                                  color: zatcaChecks[inv.id].result.compliance.passed ? '#27ae60' : '#e74c3c',
                                  padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-block',
                                }}>
                                  {zatcaChecks[inv.id].result.compliance.passed ? 'PASS ✓' : 'FAIL ✕'} ({zatcaChecks[inv.id].result.compliance.status})
                                </span>
                                <div style={{ marginTop: 4, color: '#6b7280', wordBreak: 'break-all' }}>
                                  hash: {zatcaChecks[inv.id].result.invoice_hash.slice(0, 20)}...
                                </div>
                                {zatcaChecks[inv.id].result.compliance.messages.errors.length > 0 && (
                                  <details style={{ marginTop: 4 }}>
                                    <summary style={{ cursor: 'pointer', color: '#e74c3c' }}>عرض الأخطاء</summary>
                                    <ul style={{ margin: '4px 0 0', paddingInlineStart: 16 }}>
                                      {zatcaChecks[inv.id].result.compliance.messages.errors.map((m, i) => (
                                        <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                                {zatcaChecks[inv.id].result.compliance.messages.warnings.length > 0 && (
                                  <details style={{ marginTop: 4 }}>
                                    <summary style={{ cursor: 'pointer', color: '#b7950b' }}>عرض التحذيرات</summary>
                                    <ul style={{ margin: '4px 0 0', paddingInlineStart: 16 }}>
                                      {zatcaChecks[inv.id].result.compliance.messages.warnings.map((m, i) => (
                                        <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Invoices
